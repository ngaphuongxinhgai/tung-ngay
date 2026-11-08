import type {Library} from './types';
export const demo:Library={revision:'demo',sourceKey:'demo',demo:true,decks:[{id:'greeting',name:'Giao tiếp cơ bản'},{id:'family',name:'Gia đình'},{id:'food',name:'Ăn uống'}],words:[
 ...[['你好','nǐ hǎo','Xin chào'],['谢谢','xièxie','Cảm ơn'],['再见','zàijiàn','Tạm biệt'],['对不起','duìbuqǐ','Xin lỗi'],['没关系','méi guānxi','Không sao'],['请','qǐng','Xin mời'],['早上好','zǎoshang hǎo','Chào buổi sáng'],['晚安','wǎn ān','Chúc ngủ ngon']].map((w,i)=>({id:'g'+i,deckId:'greeting',term:w[0],pinyin:w[1],meaning:w[2]})),
 ...[['爸爸','bàba','Bố'],['妈妈','māma','Mẹ'],['哥哥','gēge','Anh trai'],['姐姐','jiějie','Chị gái']].map((w,i)=>({id:'f'+i,deckId:'family',term:w[0],pinyin:w[1],meaning:w[2]})),
 ...[['水','shuǐ','Nước'],['茶','chá','Trà'],['米饭','mǐfàn','Cơm'],['面条','miàntiáo','Mì']].map((w,i)=>({id:'e'+i,deckId:'food',term:w[0],pinyin:w[1],meaning:w[2]}))]};
