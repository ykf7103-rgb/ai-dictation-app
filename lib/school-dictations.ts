// 樂善堂梁黃蕙芳紀念學校 中文科默書範圍資料
// 由教師提供嘅 .docx 範圍檔案抽取，二零二五年度第三學段

export interface SchoolDictation {
  id: string;
  grade: "P.2" | "P.3" | "P.4";
  gradeLabel: string; // 顯示用
  label: string; // e.g. "第一次（第二冊 第七、八課）"
  date?: string;
  vocabulary: string[];
  passage: string;
  passageType: "讀默" | "背默";
  /** Pre-generated FLUX-schnell image URL (POE CDN), filled after one-time gen */
  imageUrl?: string;
  /** English prompt used for image (for re-generation if URL ever expires) */
  imagePrompt: string;
}

export const SCHOOL_DICTATIONS: SchoolDictation[] = [
  {
    id: "p2-1",
    grade: "P.2",
    gradeLabel: "二年級",
    label: "第三學段第一次（第二冊 第七、八課）",
    date: "四月二十一日",
    vocabulary: [
      "聰明",
      "捉迷藏",
      "蹦蹦跳跳",
      "冷靜",
      "危險",
      "困難",
      "奇怪",
      "成功",
      "相信",
      "決心",
    ],
    passage:
      "聽見「撲通」一聲，其他小朋友都十分慌張，他們有的嚇得哭了起來，有的嚇得大喊救命，有的跑去找大人幫忙。",
    passageType: "讀默",
    imageUrl: "/passages/p2-1.jpg",
    imagePrompt:
      "watercolor children's book illustration of children at a playground hearing a splashing sound, looking surprised and worried, soft pastel colors, simple composition, no text",
  },
  {
    id: "p2-2",
    grade: "P.2",
    gradeLabel: "二年級",
    label: "第三學段第二次（第三冊 第一、二課）",
    vocabulary: [
      "傍晚",
      "笑咪咪",
      "立刻",
      "忽然",
      "電視",
      "懂事",
      "乾淨",
      "乖巧",
      "熱呼呼",
      "信心滿滿",
    ],
    passage:
      "我目不轉睛地看着媽媽切菜的手，認真地觀察切菜的方法。過了一會兒，我學着媽媽的手法，成功把胡蘿蔔和火腿切好。",
    passageType: "讀默",
    imageUrl: "/passages/p2-2.jpg",
    imagePrompt:
      "watercolor children's book illustration of a child carefully watching mother cut vegetables in a warm kitchen, soft pastel colors, simple composition, no text",
  },
  {
    id: "p3-1",
    grade: "P.3",
    gradeLabel: "三年級",
    label: "第三學段第一次（第二冊 第五、六課）",
    date: "4月20日",
    vocabulary: [
      "診所",
      "檢查",
      "稱讚",
      "勇敢",
      "輕鬆",
      "起勁",
      "鄰近",
      "泄氣",
      "靈活",
      "姿勢",
    ],
    passage:
      "我一聽，馬上就緊張起來，心想：如果醫生真的要拔掉我的牙齒，那一定很痛，怎麼辦呢？我愈想愈害怕。當媽媽帶着我走進牙科診所的時候，我感到既驚慌又好奇。「不用怕，我陪着你。」媽媽溫柔地安慰我，但我仍然沒法驅除內心的恐慌。",
    passageType: "背默",
    imageUrl: "/passages/p3-1.jpg",
    imagePrompt:
      "watercolor children's book illustration of a child walking into a friendly dental clinic with mother, looking nervous, soft pastel colors, simple composition, no text",
  },
  {
    id: "p3-2",
    grade: "P.3",
    gradeLabel: "三年級",
    label: "第三學段第二次（第二冊 第七、八課）",
    date: "5月8日",
    vocabulary: [
      "聞名",
      "雄偉",
      "設施",
      "悠揚",
      "載歌載舞",
      "飛馳",
      "目的地",
      "觀察",
      "巨型",
      "名滿天下",
    ],
    passage:
      "星期天，爸爸、媽媽帶我和弟弟到迪士尼樂園遊玩。走進樂園大門後，一座古色古香的火車站立即吸引了我的目光──從這裏開始便是「美國小鎮大街」。大街兩旁全是五彩繽紛的商店，充滿二十世紀初的美國風情。街上不時有古董車駛過，喜歡汽車的爸爸抓緊機會拍了多張照片。",
    passageType: "背默",
    imageUrl: "/passages/p3-2.jpg",
    imagePrompt:
      "watercolor children's book illustration of a colorful theme park entrance with vintage train station and old-fashioned shops on a sunny day, soft pastel colors, simple composition, no text",
  },
  {
    id: "p4-1",
    grade: "P.4",
    gradeLabel: "四年級",
    label: "第三學段第一次（第三冊 單元二 第3、4課）",
    date: "4月20日",
    vocabulary: [
      "精緻",
      "形影不離",
      "憧憬",
      "一擁而上",
      "溫馨",
      "重甸甸",
      "哽咽",
      "珍惜",
      "遙遠",
      "歉意",
    ],
    passage:
      "我往後一退，沒料到卻一腳踩在小木船上，小木船更是體無完膚了。這下子，陳明更生氣了。他一手拿起我的小木船，使勁摔在地上，還用腳踩了兩下。看着被他踩得四分五裂的小木船，我心裏又氣惱又委屈，眼淚大滴大滴地流了出來。",
    passageType: "背默",
    imageUrl: "/passages/p4-1.jpg",
    imagePrompt:
      "watercolor children's book illustration of a small wooden toy boat broken on the ground with a sad child looking at it, soft pastel colors, simple composition, no text",
  },
];

/** 將段落分句（每個句末 / 句中標點都做斷句點，啱默書一句一句聽）
 *
 *  分句規則：
 *  - 句末：。！？!?
 *  - 句中：，,；;：:（但唔包括頓號「、」，因為「爸爸、媽媽」應該係一段）
 *  - 破折號：── 或 ─ 或 —（split BEFORE，破折號去到下一段開頭）
 *
 *  例 1（讀默）：聽見「撲通」一聲，其他小朋友都十分慌張，他們有的嚇得哭了起來，有的嚇得大喊救命，有的跑去找大人幫忙。
 *  → 5 段
 *
 *  例 2（背默）：星期天，爸爸、媽媽帶我和弟弟到迪士尼樂園遊玩。走進樂園大門後，一座古色古香的火車站立即吸引了我的目光──從這裏開始便是「美國小鎮大街」。…
 *  → 9 段（「爸爸、媽媽…」一起；「──」前後分開）
 */
export function splitSentences(text: string): string[] {
  // 1. 句末/句中標點：split AFTER（標點留喺前段，例如「星期天，」）
  // 2. 破折號：split BEFORE 第一個 ─/—，但 sequence 入面唔再 split（避免「──」分開）
  return text
    .split(/(?<=[。！？!?，,；;：:])|(?<![─—])(?=[─—])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const GRADES_WITH_DATA = ["P.2", "P.3", "P.4"] as const;
