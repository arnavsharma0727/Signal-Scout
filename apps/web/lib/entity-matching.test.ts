import {describe,expect,it} from 'vitest';
import {matchEntityText} from './entity-matching';

const fruitMentions=[
  'Apple pie is cooling on the counter','Fresh apple juice for breakfast','The apple orchard opens this weekend','An apple tree fell in the storm','Apple picking season starts today',
  'Caramel apple recipe with cinnamon','Homemade applesauce for dinner','Local apple cider festival','Baked apple crisp with oats','Apple crumble with vanilla ice cream',
  'Making apple butter at home','The apple seeds were planted','A branch from the apple tree broke','Wild apples grow near the trail','Green apples are tart',
  'Orchard apples are ready to harvest','Cooking apples work best for this pie','Apple harvest was strong this year','The farmer sells apples by the bushel','A basket of apples from the garden',
];

describe('deterministic entity alias matching',()=>{
  it.each(fruitMentions)('rejects ambiguous fruit context: %s',text=>{
    const negative=['apple pie','apple juice','apple orchard','apple tree','apple picking','caramel apple','applesauce','apple cider','apple crisp','apple crumble','apple butter','apple seeds','branch from the apple','wild apples','green apples','orchard apples','cooking apples','apple harvest','sells apples','basket of apples'];
    expect(matchEntityText(text,{positive:['Apple','AAPL','애플'],negative}).matched).toBe(false);
  });
  it('matches a company alias and Korean literal without assigning a probability',()=>{
    expect(matchEntityText('Apple announces a new iPhone',{positive:['Apple','AAPL','애플']})).toEqual({matched:true,alias:'Apple'});
    expect(matchEntityText('애플 신제품 출시',{positive:['Apple','AAPL','애플']})).toEqual({matched:true,alias:'애플'});
  });
  it('requires whole-token matching for Latin aliases',()=>{
    expect(matchEntityText('pineapple demand rose',{positive:['Apple']}).matched).toBe(false);
  });
  it('negative aliases take precedence over a positive company alias',()=>{
    expect(matchEntityText('Apple pie recipe',{positive:['Apple'],negative:['apple pie']})).toMatchObject({matched:false,blockedBy:'apple pie'});
  });
});
