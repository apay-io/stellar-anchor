import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletsModule } from './wallets/wallets.module';
import { RedisModule, RedisService } from 'nestjs-redis';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { WalletFactoryService } from './wallets/wallet-factory.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import redis from './config/redis';
import app from './config/app';
import assets from './config/assets';

const mockResponse = () => {
  const res = {} as any;
  res.render = jest.fn().mockImplementation((template, options) => {
    const tmp = Handlebars.compile(readFileSync(__dirname + '/../views/' + template + '.hbs').toString());
    return tmp(options);
  });
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AppController', () => {
  let appController: AppController;
  const walletOutStub = {
    isValidDestination: jest.fn().mockImplementation((asset, address) => {
      return address.length > 34;
    })
  };

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      imports: [
        ConfigModule.forRoot({
          envFilePath: [process.cwd() + '/' + (process.env.NODE_ENV || '') + '.env'],
          load: [app, assets, redis],
        }),
        RedisModule.register({ url: 'redis://:@transfer-server-redis:6379' }),
        WalletsModule,
      ],
      providers: [AppService,
        ConfigService,
        { provide: RedisService, useValue: {}},
        { provide: WalletFactoryService, useValue: { get: () => { return { walletOut: walletOutStub } }}}
      ],
    }).compile();

    appController = testingModule.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should generate stellar.toml', () => {
      const fakeReq = {headers: {host: 'apay.io'}};
      const res = mockResponse();
      const response = appController.getStellarToml(fakeReq, res);

      expect(res.render).toHaveBeenCalledTimes(1);
      expect(response).toContain('TRANSFER_SERVER="https://apay.io/sep-0006"');
      expect(response).toContain('SIGNING_KEY=');
      expect(response).toContain('[[CURRENCIES]]');
      expect(response).toContain('status="live"');
    });

    it('should validate address', async () => {
      const response = await appController.validateDestination({
        asset_code: 'TBTC',
        dest: '2N1SYvx6bncD6XRKvmJUKQua6n66agZ5X3n',
      });

      expect(response).toEqual(true);

      const response2 = await appController.validateDestination({
        asset_code: 'TBTC',
        dest: '2N1SYvx6bncD6XRKvmJUKQua6n66agZ5X3',
      });

      expect(response2).toEqual(false);
    });
  });
});
