import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { matchEntityText } from './entity-matching';
import { companyProfile } from './profile';
import { expandProfileSeed } from './profile-seed';

const seedPath = path.resolve(process.cwd(), '../../profiles/core_entities.json');
const seeds = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as Array<Record<string, any>>;
const byTicker = new Map(seeds.map(profile => [profile.ticker, profile]));

describe('core cross-market profile seed', () => {
  it('contains at least 40 unique reviewed entity/instrument profiles with valid KR and US markets', () => {
    expect(seeds.length).toBeGreaterThanOrEqual(40);
    expect(new Set(seeds.map(profile => profile.ticker)).size).toBe(seeds.length);
    for (const seed of seeds) {
      const parsed = companyProfile.safeParse(expandProfileSeed(seed));
      expect(parsed.success, `${seed.ticker} should satisfy the profile contract`).toBe(true);
      if (parsed.success) expect(parsed.data.markets.map(market => `${market.market_code}/${market.language_code}`)).toEqual(['KR/ko', 'US/en']);
    }
  });

  it.each([
    ['AAPL', [
      'Apple pie is cooling on the counter','Fresh apple juice for breakfast','The apple orchard opens this weekend','An apple tree fell in the storm','Apple picking season starts today',
      'Caramel apple recipe with cinnamon','Homemade applesauce for dinner','Local apple cider festival','Baked apple crisp with oats','Apple crumble with vanilla ice cream',
      'Making apple butter at home','The apple seeds were planted','A branch from the apple tree broke','Wild apples grow near the trail','Green apples are tart',
      'Orchard apples are ready to harvest','Cooking apples work best for this pie','Apple harvest was strong this year','The farmer sells apples by the bushel','A basket of apples from the garden',
    ]],
    ['AMZN', [
      'Amazon rainforest conservation expands','The Amazon River flooded again','Researchers study the Amazon basin','A hike through the Amazon jungle','Amazon rainforest fires spread',
      'Amazon river dolphins face habitat loss','Amazonian rainforest species decline','The Amazonas state announced new protections','Amazonas River water levels fell','Deforestation in the Amazon basin accelerates',
      'Amazon rainforest biodiversity is threatened','Amazon deforestation reached a new high','Canopy research in the Amazon rainforest','Communities live in the Amazon river basin','An expedition crossed the Amazon jungle',
      'Amazonian species were found in the floodplain','The Amazon floodplain is under water','Forest fires burned across the Amazon forest','A report covers the Amazonas rainforest','Rainforest researchers returned from the Amazon rainforest',
    ]],
    ['035720', [
      '카카오닙스는 초콜릿 원료로 사용된다','카카오 파우더로 음료를 만들었다','카카오 가루를 반죽에 넣는다','카카오버터 수입 가격이 올랐다','카카오빈 발효 과정을 조사한다',
      '카카오 열매 수확 시기가 다가온다','카카오 나무 재배 지역을 소개한다','카카오 함량이 높은 초콜릿','카카오 음료 신제품 출시','카카오 초콜릿 생산량 감소',
      '카카오 농장 노동 환경 조사','카카오 재배 면적이 늘었다','카카오 품종별 향을 비교했다','카카오 가격이 급등했다','카카오 생산 전망이 어둡다',
      '카카오 수확량이 줄었다','카카오 선물 가격 변동','카카오 분말 수요가 증가한다','카카오 페이스트 제조 공정','카카오 원료 공급이 부족하다',
    ]],
  ])('rejects 20 non-company contexts for ambiguous alias %s', (ticker, texts) => {
    const profile = byTicker.get(ticker)!;
    const language = profile.negative_aliases_en ? 'en' : 'ko';
    const aliases = profile[`market_aliases_${language}`];
    const negatives = profile[`negative_aliases_${language}`];
    expect(negatives.length).toBeGreaterThanOrEqual(20);
    for (const text of texts) expect(matchEntityText(text, { positive: aliases, negative: negatives }).matched, `${ticker}: ${text}`).toBe(false);
  });
});
