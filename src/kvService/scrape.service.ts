import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { KvService } from './kvService.entity';
import { ConfigService } from '@nestjs/config';
import moment = require('moment');

@Injectable()
export class ScrapeService {
  private static isBusyScraping = false;
  private page: puppeteer.Page;
  private kvHamburgLoginUrl = 'https://www.ekvhh.de/eHealthPortal/login/index.xhtml';

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

    this.username = this.config.get('KV_USERNAME');
    this.password = this.config.get('KV_PASSWORD');
    this.monthsInAdvance = Number.parseInt(this.config.get('KV_MONTHS_IN_ADVANCE'), 10);
    this.desiredRegions = this.config.get<string>('KV_REGIONS').split(',');

    moment.locale('de');
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

      if (this.regions.length === 0) {
        await this.prepareRegions();
      }

      this.services = [];
      for (const region of this.regions) {
        this.logger.debug(`======== ${region.name} ========`, 'ScraperService');
        await this.page.select('#regionselector', region.value);
        await this.page.waitFor(2000);

        for (let month = 0; month <= this.monthsInAdvance; month++) {
          await this.page.goto(this.getDiensteUrl(month));

          const dateReference = moment().month(moment().month() + month).format('MMMM') + ' ' + moment().format('YYYY');
          const dateActual = await this.page.$eval('#calendar-control-header', (e) => e.textContent.trim());
          if (dateActual !== dateReference) {
            throw new Error('Scraping wrong date');
          }

          const regionActual = await this.page.$eval('#regionselector > option[selected=selected]', (e) => e.textContent);
          if (regionActual !== region.name) {
            throw new Error('Scraping wrong region');
          }

          this.logger.debug(`Scraping +${month} month(s) in advance`, 'ScraperService');
          const result = await this.crawlDienstePerMonth();
          this.logger.debug(`Found #services: ${result.length}`, 'ScraperService');

          for (const serviceInMonth of result) {
            const parsedService = KvService.parse(serviceInMonth, region.name);
            if (parsedService) {
              this.services.push(parsedService);
            }
          }
        }
      }
      await this.page.goto(await this.logoutLink);
      await this.page.waitForNavigation();

      this.logger.debug('Closing Browser', 'ScraperService');
      await browser.close();
    } catch (e) {
      this.logger.error('An error occured: ', e, 'ScraperService');
      await this.takeScreenshot();
      throw e;
    } finally {
      ScrapeService.isBusyScraping = false;
    }
    return this.services;
  }

  private getDiensteUrl(monthsInAdvance: number) {
    const month = moment().month(moment().month() + monthsInAdvance).format('MM');
    const year = moment().format('YYYY');

    // tslint:disable-next-line: max-line-length
    return `https://www.ekvhh.de/eHealthPortal/core/protected/extapp/proxy/1530/dienstplan/calendarlist?month=${month}&start_at=${year}-${month}-01&year=${year}`;
  }

  private async saveLogoutLink(): Promise<void> {
    const link = await this.page.waitForSelector('a.logoutlink');
    this.logoutLink = (await link.getProperty('href')).jsonValue();
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
    await this.page.waitFor('#caldata tbody');
    return await this.parseDienste();
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
    if (this.config.get('MODE') === 'local') {
      this.logger.debug('Preparing Screenshot', 'ScraperService');
      this.logger.debug('Taking Screenshot', 'ScraperService');

      await this.page.screenshot({ path: `screens/screenshot_${new Date()}.png` });
    }
  }
}

// tslint:disable-next-line: max-classes-per-file
class Region {
  constructor(readonly name: string, readonly value: string) { }
}
