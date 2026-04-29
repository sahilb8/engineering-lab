import { Test, TestingModule } from '@nestjs/testing';
import { HouseholdsController } from './households.controller';

describe('HouseholdsController', () => {
  let controller: HouseholdsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HouseholdsController],
    }).compile();

    controller = module.get<HouseholdsController>(HouseholdsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
