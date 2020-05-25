import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { KvService } from './kvService.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScrapeService {
  private static isBusyScraping = false;
  private page: puppeteer.Page;
  private kvHamburgLoginUrl = 'https://www.ekvhh.de/eHealthPortal/login/index.xhtml';
  private diensteUrl = '';

  private monthsInAdvance = 0;
  private desiredRegions = ['West', 'Ost', 'NW'];
  private regions: Region[] = [];
  private logoutLink: Promise<string>;

  private username: string;
  private password: string;
  services: KvService[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger) {

    const d = new Date();
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth() + 1;

    this.diensteUrl = `
    https://www.ekvhh.de/eHealthPortal/core/protected/extapp/proxy/1530/dienstplan/calendarlist
    ?month=${currentMonth}&start_at=${currentYear}-${currentMonth}-01&year=${currentYear}
    `;

    this.username = this.config.get('KV_USERNAME');
    this.password = this.config.get('KV_PASSWORD');
    this.monthsInAdvance = Number.parseInt(this.config.get('KV_MONTHS_IN_ADVANCE'), 10);
    this.desiredRegions = this.config.get<string>('KV_REGIONS').split(',');
  }

  async scrapeKvHamburg(): Promise<KvService[]> {
    if (ScrapeService.isBusyScraping) {
      throw new Error('Scraping process is already running.');
    }

    try {
      ScrapeService.isBusyScraping = true;
      this.logger.debug('Starting browser', 'ScraperService');
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });

      this.page = await browser.newPage();

      this.logger.debug('Navigating to KV', 'ScraperService');
      await this.page.goto(this.kvHamburgLoginUrl);

      await this.login();
      await this.navigateToAnwendung();
      await this.saveLogoutLink();
      await this.navigateToiFrame();

      await this.prepareRegions();

      for (const region of this.regions) {
        this.logger.debug(`======== ${region.name} ========`, 'ScraperService');
        await this.page.select('#regionselector', region.value);
        await this.page.waitFor(2000);
        await this.page.goto(this.diensteUrl);

        const result = await this.scrapeDiensteFrame();
        for (const serviceInMonth of result) {
          const parsedService = KvService.parse(serviceInMonth, region.name);
          if (parsedService) {
            this.services.push(parsedService);
          }
        }
      }
      await this.page.goto(await this.logoutLink);

      await this.page.waitForNavigation();

      this.logger.debug('Closing Browser', 'ScraperService');
      browser.close();
      return this.services;
    } catch (e) {
      this.logger.error('An error occured: ' + e, '', 'ScraperService');
      if (this.config.get('MODE') === 'local') {
        await this.takeScreenshot();
      }
    } finally {
      ScrapeService.isBusyScraping = false;
    }
  }
  private async saveLogoutLink(): Promise<void> {
    const link = await this.page.waitForSelector('a.logoutlink');
    this.logoutLink = (await link.getProperty('href')).jsonValue();
  }

  private async scrapeDiensteFrame(): Promise<string[][]> {
    this.logger.debug('-> "Tauschbörse"', 'ScraperService');
    await this.page.waitForSelector('a#tausch_boerse', { visible: true }).then(elem => elem.click());

    this.logger.debug('-> "Liste"', 'ScraperService');
    await this.page.waitForSelector('a#calendar_list', { visible: true }).then(elem => elem.click());

    this.logger.debug('Loading "Liste"', 'ScraperService');
    await this.page.waitFor('#caldata tbody');

    return await this.crawlDienstePerMonth();
  }

  private async prepareRegions(): Promise<void> {
    const promises: Array<Promise<void>> = [];

    await this.page.waitForSelector('#regionselector');

    this.desiredRegions.forEach(async regionName => {
      const p = new Promise<void>(async (resolve, reject) => {
        try {
          const option = (await this.page.$x(`//*[@id="regionselector"]/option[text()="${regionName}"]`))[0];
          const value = await (await option.getProperty('value')).jsonValue();
          this.regions.push(new Region(regionName, value));
        } catch (e) {
          this.logger.error(`failed to find region ${regionName}`);
          reject();
        }
        resolve();
      });
      promises.push(p);
    });
    return Promise.all(promises).then(voids => { return; });
  }

  private async crawlDienstePerMonth(): Promise<string[][]> {
    let cycle = 0;
    let data: string[][] = [];

    this.logger.debug('Scraping current month', 'ScraperService');
    await this.page.waitFor(2000);
    do {
      if (cycle > 0) {
        this.logger.debug('Click on next month', 'ScraperService');
        this.logger.debug(`Scraping ${cycle} month in advance`, 'ScraperService');
        await this.page.waitFor('#calendar-control > div > div:nth-child(3) > a').then(elem => elem.click());
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      }
      await this.page.waitFor('#caldata tbody');
      const result = await this.parseDienste();
      data = data.concat(result);

      this.logger.debug(`Found #services: ${result.length}`, 'ScraperService');
      cycle++;
    } while (cycle < (this.monthsInAdvance + 1));

    return data;
  }
  /**
   * parse html to raw data
   * ['id',]
   */
  private parseDienste(): Promise<string[][]> {
    // get all rows
    return this.page.$$eval('#caldata tbody tr',
      // get all tds
      trs => trs.map(tr => {
        // expand all
        const tds = [...tr.getElementsByTagName('td')];
        const data = [];
        // empty table comes with default message:
        // "Es werden zur Zeit keine Dienste zum Tausch oder zur Abgabe angeboten."
        if (tds.length === 1) { return []; }
        // id: "line_248276"
        data.push(Number.parseInt(tr.id.substr(5), 10));
        return data.concat(tds.map(td => td.textContent.trim()));
      }),
    );

  }

  private async navigateToAnwendung() {
    // find Anwendung
    this.logger.debug('-> "Anwendung"', 'ScraperService');
    await this.page.waitFor('a[id="j_id55\:navid_1500"]').then(elem => elem.click());

    // find ND-Online
    this.logger.debug('-> "ND-Online"', 'ScraperService');
    await this.page.waitFor('a[id="j_id55\:navid_1530"]').then(elem => elem.click());
  }

  private async navigateToiFrame(): Promise<void> {
    // extract src attribute from iframe
    const frameUrl: string = await this.page.waitForSelector('iframe[name=Anwendung]').then(async el => {
      return (await el.getProperty('src')).jsonValue();
    });

    await this.page.goto(frameUrl);
  }

  private async login(): Promise<void> {
    // first redirect to login screen
    this.logger.debug('Loading Login Screen', 'ScraperService');
    await this.page.click('a.loginbutton');
    await this.page.waitFor('input[name=IDToken1]');

    // add username
    this.logger.debug('Filling username + password', 'ScraperService');
    await this.page.$eval('input[name=IDToken1]', (elem: HTMLInputElement, username) => elem.value = username, this.username);

    // add password
    await this.page.$eval('input[name=IDToken2]', (elem: HTMLInputElement, password) => elem.value = password, this.password);

    // hit anmelden
    this.logger.debug('Submitting credentials ', 'ScraperService');
    return this.page.click('input.Btn1Def');
  }

  private async takeScreenshot() {
    this.logger.debug('Preparing Screenshot', 'ScraperService');
    // await this.page.waitFor(1000)
    this.logger.debug('Taking Screenshot', 'ScraperService');
    await this.page.screenshot({ path: 'screenshot.png' });
  }
}

// tslint:disable-next-line: max-classes-per-file
class Region {
  constructor(readonly name: string, readonly value: string) { }
}
