import {describe,expect,it} from 'vitest';
import {concentrationScore,documentWeight,evidenceThresholds,narrativeTopicGap,recencyScore,researchPriority,smoothedTopicShare} from './divergence';
describe('cross-market methodology',()=>{
 it('applies source tier and entity confidence weights',()=>expect(documentWeight(2,.8)).toBeCloseTo(.6));
 it('discounts syndicated duplicates',()=>expect(documentWeight(1,1,true)).toBe(.1));
 it('calculates smoothed topic shares',()=>expect(smoothedTopicShare(1,2)).toBeCloseTo(.5));
 it('calculates narrative topic difference',()=>expect(narrativeTopicGap(2,4,1,4)).toBeCloseTo(.1667,3));
 it('uses documented decay and concentration',()=>{expect(recencyScore(72)).toBeCloseTo(.5);expect(concentrationScore(5)).toBe(1)});
 it('bounds priority to 0-100',()=>expect(researchPriority({recency:1,sourceQuality:1,concentration:1,divergence:1,evidenceQuality:1,penalty:0})).toBe(100));
 it('requires every evidence threshold',()=>expect(evidenceThresholds({topicWeight:.8,totalWeight:2,independentSources:2,documents:2,averageEntityConfidence:.8,hasTierOneOrTwo:true,hasThreeIndependentTierThreePlus:false,fresh:true,englishAvailable:true}).eligible).toBe(true));
});
