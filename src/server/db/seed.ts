import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { lessons, quizQuestions } from "./schema";

type SeedImage = {
  id: string;
  type: "inline-svg" | "external";
  alt: string;
  variant?: string;
  src?: string;
  caption?: string;
};

type SeedReference = {
  title: string;
  url: string;
  publisher: string;
};

type SeedQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
};

type SeedLesson = {
  id: string;
  day: number;
  title: string;
  category: string;
  lessonDate: string;
  summary: string;
  contentFile: string;
  images: SeedImage[];
  references: SeedReference[];
  relatedTopics: string[];
  tags: string[];
  estimatedMinutes: number;
  quiz: SeedQuizQuestion[];
};

const seedDefinitions: SeedLesson[] = [
  {
    id: "day-001",
    day: 1,
    title: "AES 與 RSA 的差異",
    category: "資訊安全與密碼學",
    lessonDate: "2026-11-06",
    summary:
      "從對稱式與非對稱式加密的差異出發，理解 AES、RSA 與混合式加密各自負責什麼。",
    contentFile: "content/lessons/day-001.md",
    images: [
      {
        id: "day-001-aes-rsa",
        type: "inline-svg",
        variant: "symmetric-vs-asymmetric",
        alt: "AES 使用雙方共用的秘密金鑰；RSA 使用成對的公鑰與私鑰。",
        caption:
          "圖 1：AES 的秘密金鑰必須安全共享；RSA 將可公開的公鑰與必須保密的私鑰分開。",
      },
    ],
    references: [
      {
        title: "FIPS 197: Advanced Encryption Standard",
        publisher: "NIST",
        url: "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf",
      },
      {
        title: "Recommendation for Key Management, Part 1",
        publisher: "NIST",
        url: "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf",
      },
      {
        title: "PKCS #1: RSA Cryptography Specifications Version 2.2",
        publisher: "RFC Editor",
        url: "https://www.rfc-editor.org/rfc/rfc8017",
      },
    ],
    relatedTopics: ["混合式加密", "TLS", "數位簽章", "金鑰管理"],
    tags: ["AES", "RSA", "對稱式加密", "非對稱式加密", "密碼學", "TLS"],
    estimatedMinutes: 9,
    quiz: [
      {
        id: "day-001-q1",
        prompt: "下列哪一項最能描述 AES 的金鑰關係？",
        options: [
          "傳送端使用公鑰，接收端使用私鑰",
          "雙方使用同一把對稱秘密金鑰",
          "只需要雜湊值，不需要金鑰",
          "金鑰只能由憑證授權機構保管",
        ],
        correctOption: 1,
        explanation:
          "AES 是對稱式加密。傳送端與接收端必須取得相同的秘密金鑰，並透過安全方式管理與更新它。",
      },
      {
        id: "day-001-q2",
        prompt: "混合式加密中，RSA 最常扮演哪個角色？",
        options: [
          "直接加密所有大型影片檔",
          "保護短期 AES 工作金鑰或協助驗證身分",
          "取代作業系統的存取權限",
          "把密文變成不可讀的網址",
        ],
        correctOption: 1,
        explanation:
          "RSA 運算成本較高，較適合處理少量金鑰資料或用於簽章。大量內容通常交给 AES，再用 RSA 等機制保護 AES 金鑰。",
      },
      {
        id: "day-001-q3",
        prompt: "為什麼 TLS 類協定通常不會只用 RSA 直接加密整個網頁連線內容？",
        options: [
          "因為 RSA 不能處理任何數字",
          "因為對稱式加密處理大量資料更有效率，RSA 可協助建立或保護工作金鑰",
          "因為 AES 只能用來簽章",
          "因為公鑰不能公開",
        ],
        correctOption: 1,
        explanation:
          "對稱式加密適合大量資料；非對稱式機制與金鑰協定可協助雙方建立安全的共同金鑰。實際 TLS 設計還包含認證、AEAD 與前向保密等考量。",
      },
    ],
  },
  {
    id: "day-002",
    day: 2,
    title: "Windows Process 與 Windows API",
    category: "作業系統與 Windows",
    lessonDate: "2026-11-07",
    summary:
      "理解 Windows Process、Thread、Handle 與使用者模式／核心模式邊界，建立看懂 Windows API 的基礎。",
    contentFile: "content/lessons/day-002.md",
    images: [
      {
        id: "day-002-process-boundary",
        type: "inline-svg",
        variant: "windows-process-boundary",
        alt: "應用程式從使用者模式透過 Windows API 進入核心模式，再取得 Process Handle 與權限。",
        caption:
          "圖 1：Windows API 呼叫會跨越使用者模式與核心模式邊界；Handle 代表一組受作業系統檢查的存取權限。",
      },
    ],
    references: [
      {
        title: "Processes and Threads",
        publisher: "Microsoft Learn",
        url: "https://learn.microsoft.com/windows/win32/procthread/processes-and-threads",
      },
      {
        title: "Process Security and Access Rights",
        publisher: "Microsoft Learn",
        url: "https://learn.microsoft.com/windows/win32/procthread/process-security-and-access-rights",
      },
      {
        title: "CreateProcessW function",
        publisher: "Microsoft Learn",
        url: "https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw",
      },
    ],
    relatedTopics: ["Thread", "Handle", "虛擬記憶體", "存取權杖", "端點防護"],
    tags: ["Windows", "Windows API", "Process", "Thread", "Handle", "作業系統"],
    estimatedMinutes: 10,
    quiz: [
      {
        id: "day-002-q1",
        prompt: "在 Windows 中，哪一項通常提供較強的記憶體隔離？",
        options: [
          "同一個 Process 內的兩個 Thread",
          "兩個不同的 Process",
          "同一個 Handle 的兩個數字",
          "同一個 C++ 命名空間",
        ],
        correctOption: 1,
        explanation:
          "不同 Process 通常有各自隔離的虛擬位址空間。同一 Process 內的多個 Thread 通常共享位址空間，因此隔離程度不同。",
      },
      {
        id: "day-002-q2",
        prompt: "為什麼不能把 Windows API 想成完全等同於普通函式庫呼叫？",
        options: [
          "因為 Windows API 只能處理圖片",
          "因為 API 可能跨越使用者模式與核心模式，由核心檢查權限並操作受保護資源",
          "因為所有 API 都會自動提升為管理員",
          "因為 Windows API 不使用任何記憶體",
        ],
        correctOption: 1,
        explanation:
          "許多 Win32 API 背後會進入核心模式。作業系統核心是特權邊界，會檢查呼叫者權限，不會因為呼叫 API 就自動授予管理員權限。",
      },
      {
        id: "day-002-q3",
        prompt: "取得某個 Process 的識別碼（PID）後，是否能保證可以任意操作該 Process？",
        options: [
          "可以，PID 就是完整的通行證",
          "不行，仍需要取得具有相應存取權限的 Handle 並通過安全檢查",
          "可以，只要能讀到數字就代表管理員",
          "不行，因為 Process 永遠沒有記憶體",
        ],
        correctOption: 1,
        explanation:
          "PID 只是識別值。實際操作需要 Handle，而 Handle 會受到呼叫者權杖、目標物件的安全性描述元與請求的 access rights 限制。",
      },
    ],
  },
  {
    id: "day-003",
    day: 3,
    title: "勒索病毒的混合式加密流程",
    category: "資訊安全與密碼學",
    lessonDate: "2026-11-08",
    summary:
      "拆解勒索病毒如何結合 AES 與 RSA 加密檔案，並從備份、權限與事件處理角度建立防禦思維。",
    contentFile: "content/lessons/day-003.md",
    images: [
      {
        id: "day-003-ransomware-flow",
        type: "inline-svg",
        variant: "ransomware-hybrid-flow",
        alt: "勒索病毒以 AES 加密檔案，再用攻擊者 RSA 公鑰包裝 AES 工作金鑰。",
        caption:
          "圖 1：勒索流程將大量檔案交给 AES 加密，再利用 RSA 公鑰保護工作金鑰。",
      },
    ],
    references: [
      {
        title: "Ransomware Protection and Response",
        publisher: "CISA",
        url: "https://www.cisa.gov/stopransomware/ransomware-guide",
      },
      {
        title: "Data Backup Options",
        publisher: "CISA",
        url: "https://www.cisa.gov/resources-tools/resources/data-backup-options",
      },
      {
        title: "FIPS 197: Advanced Encryption Standard",
        publisher: "NIST",
        url: "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf",
      },
    ],
    relatedTopics: ["混合式加密", "備份", "網路分段", "事件回應", "數位鑑識"],
    tags: ["勒索病毒", "ransomware", "AES", "RSA", "備份", "事件回應"],
    estimatedMinutes: 8,
    quiz: [
      {
        id: "day-003-q1",
        prompt: "勒索病毒採用混合式加密時，最常見的分工是什麼？",
        options: [
          "AES 產生作業系統權限，RSA 建立檔案",
          "AES 加密檔案，RSA 公鑰保護 AES 工作金鑰",
          "RSA 只用來壓縮圖片，AES 負責解密備份",
          "兩者都只能用來產生網頁密碼",
        ],
        correctOption: 1,
        explanation:
          "大量檔案適合用 AES 處理；RSA 可用來保護 AES 工作金鑰。實際惡意程式可能批次處理或使用不同金鑰策略，但核心是分層保護。",
      },
      {
        id: "day-003-q2",
        prompt: "為什麼攻擊者通常不把 RSA 私鑰直接留在受害電腦？",
        options: [
          "因為私鑰會讓 CPU 速度變慢",
          "因為受害者若取得私鑰，就可能解密被包裝的工作金鑰",
          "因為 RSA 私鑰必須公開",
          "因為私鑰只能加密圖片",
        ],
        correctOption: 1,
        explanation:
          "RSA 私鑰是解密或簽章的重要秘密。若受害者取得私鑰與包裝後的金鑰，就可能恢復 AES 工作金鑰。",
      },
      {
        id: "day-003-q3",
        prompt: "哪一種備份策略最能降低勒索病毒刪除或加密備份的風險？",
        options: [
          "每天把備份硬碟長時間接在同一台工作站",
          "使用離線備份或不可變備份，並讓日常帳號無法任意刪除",
          "只用同一個管理員帳號備份到同一顆系統碟",
          "把唯一備份放在原本的資料夾旁邊",
        ],
        correctOption: 1,
        explanation:
          "離線或不可變備份可降低惡意程式透過同一帳號與網路路徑破壞備份的機會。備份仍要定期測試復原，不能只看檔案是否存在。",
      },
    ],
  },
];

export function seedLessons(): void {
  for (const seed of seedDefinitions) {
    const existing = db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, seed.id)).get();
    if (!existing) {
      const content = fs.readFileSync(path.join(process.cwd(), seed.contentFile), "utf8");
      const createdAt = `${seed.lessonDate}T00:00:00.000Z`;
      db.insert(lessons)
        .values({
          id: seed.id,
          day: seed.day,
          title: seed.title,
          category: seed.category,
          lessonDate: seed.lessonDate,
          summary: seed.summary,
          content,
          imagesJson: JSON.stringify(seed.images),
          referencesJson: JSON.stringify(seed.references),
          relatedTopicsJson: JSON.stringify(seed.relatedTopics),
          tagsJson: JSON.stringify(seed.tags),
          estimatedMinutes: seed.estimatedMinutes,
          createdAt,
          updatedAt: createdAt,
        })
        .run();
    }

    seed.quiz.forEach((question, index) => {
      db.insert(quizQuestions)
        .values({
          id: question.id,
          lessonId: seed.id,
          position: index + 1,
          prompt: question.prompt,
          optionsJson: JSON.stringify(question.options),
          correctOption: question.correctOption,
          explanation: question.explanation,
        })
        .onConflictDoNothing()
        .run();
    });
  }
}
