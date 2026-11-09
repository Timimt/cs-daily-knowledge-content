import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { createPortal } from "react-dom";
import type { LessonImage } from "../shared/types";

function SymmetricAsymmetricSvg() {
  return (
    <svg viewBox="0 0 920 470" role="img" aria-labelledby="aes-rsa-title aes-rsa-desc">
      <title id="aes-rsa-title">AES 與 RSA 的差異</title>
      <desc id="aes-rsa-desc">
        AES 傳送端與接收端共用秘密金鑰；RSA 使用公開金鑰與私密金鑰。
      </desc>
      <rect width="920" height="470" fill="#eef7f4" />
      <g fill="none" stroke="#b8d9d2" strokeWidth="1">
        <path d="M0 78h920M0 156h920M0 234h920M0 312h920M0 390h920" />
        <path d="M115 0v470M230 0v470M345 0v470M460 0v470M575 0v470M690 0v470M805 0v470" />
      </g>
      <rect x="42" y="40" width="836" height="390" rx="28" fill="#ffffff" stroke="#d5e4df" />
      <line x1="460" y1="86" x2="460" y2="386" stroke="#d5e4df" strokeWidth="2" />

      <text x="96" y="102" fill="#0a7d74" fontSize="16" fontWeight="800">AES · 對稱式</text>
      <text x="96" y="138" fill="#16283a" fontSize="25" fontWeight="800">一把共同秘密金鑰</text>
      <rect x="92" y="184" width="120" height="78" rx="16" fill="#e3f5f1" stroke="#0b938b" strokeWidth="2" />
      <text x="128" y="216" fill="#16283a" fontSize="15" fontWeight="700">傳送端</text>
      <text x="130" y="241" fill="#60717d" fontSize="12">加密 P</text>
      <rect x="316" y="184" width="120" height="78" rx="16" fill="#e3f5f1" stroke="#0b938b" strokeWidth="2" />
      <text x="352" y="216" fill="#16283a" fontSize="15" fontWeight="700">接收端</text>
      <text x="352" y="241" fill="#60717d" fontSize="12">解密 C</text>
      <path d="M213 206h102" stroke="#0b938b" strokeWidth="4" />
      <path d="m303 198 14 8-14 8z" fill="#0b938b" />
      <path d="M315 245H213" stroke="#0b938b" strokeWidth="3" strokeDasharray="7 6" />
      <path d="m225 237-14 8 14 8z" fill="#0b938b" />
      <rect x="198" y="282" width="132" height="44" rx="22" fill="#10243b" />
      <text x="239" y="309" fill="#ffffff" fontSize="14" fontWeight="800">共用金鑰 K</text>
      <path d="M264 282v-20" stroke="#10243b" strokeWidth="2" />
      <text x="100" y="364" fill="#60717d" fontSize="14">優點：大量資料速度快</text>
      <text x="100" y="390" fill="#60717d" fontSize="14">挑戰：如何安全共享 K</text>

      <text x="508" y="102" fill="#a96523" fontSize="16" fontWeight="800">RSA · 非對稱式</text>
      <text x="508" y="138" fill="#16283a" fontSize="25" fontWeight="800">公鑰與私鑰分工</text>
      <rect x="500" y="184" width="142" height="78" rx="16" fill="#fff1e7" stroke="#d4872f" strokeWidth="2" />
      <text x="532" y="216" fill="#16283a" fontSize="15" fontWeight="700">公開的公鑰</text>
      <text x="541" y="241" fill="#60717d" fontSize="12">加密或驗證</text>
      <rect x="733" y="184" width="108" height="78" rx="16" fill="#f5ece6" stroke="#9b6540" strokeWidth="2" />
      <text x="751" y="216" fill="#16283a" fontSize="15" fontWeight="700">保密的私鑰</text>
      <text x="761" y="241" fill="#60717d" fontSize="12">解密或簽章</text>
      <path d="M644 213h78" stroke="#d4872f" strokeWidth="4" />
      <path d="m710 205 14 8-14 8z" fill="#d4872f" />
      <path d="M733 257H644" stroke="#9b6540" strokeWidth="3" strokeDasharray="7 6" />
      <path d="m656 249-14 8 14 8z" fill="#9b6540" />
      <text x="528" y="310" fill="#60717d" fontSize="13">成對但有不同用途</text>
      <text x="508" y="364" fill="#60717d" fontSize="14">適合：金鑰包裝、簽章</text>
      <text x="508" y="390" fill="#60717d" fontSize="14">不適合：直接加密大量檔案</text>
    </svg>
  );
}

function WindowsBoundarySvg() {
  return (
    <svg viewBox="0 0 920 470" role="img" aria-labelledby="win-title win-desc">
      <title id="win-title">Windows Process 與 API 邊界</title>
      <desc id="win-desc">
        使用者模式應用程式透過 Windows API 跨越邊界，由核心檢查權限並建立 Process Handle。
      </desc>
      <rect width="920" height="470" fill="#edf4fa" />
      <rect x="44" y="40" width="832" height="390" rx="28" fill="#ffffff" stroke="#d3e1ec" />
      <rect x="86" y="82" width="748" height="112" rx="20" fill="#edf6f3" stroke="#b7dcd3" />
      <text x="112" y="115" fill="#0a7d74" fontSize="15" fontWeight="800">USER MODE · 使用者模式</text>
      <text x="112" y="151" fill="#17283a" fontSize="21" fontWeight="800">應用程式 A</text>
      <text x="405" y="151" fill="#60717d" fontSize="14">呼叫 CreateProcessW / OpenProcess</text>
      <rect x="86" y="286" width="748" height="108" rx="20" fill="#10243b" />
      <text x="112" y="319" fill="#93e5db" fontSize="15" fontWeight="800">KERNEL MODE · 核心模式</text>
      <text x="112" y="355" fill="#ffffff" fontSize="20" fontWeight="800">權限檢查 · 物件管理 · 記憶體隔離</text>
      <path d="M460 206v62" stroke="#0b938b" strokeWidth="5" />
      <path d="m449 254 11 15 11-15z" fill="#0b938b" />
      <path d="M506 270v-58" stroke="#d4872f" strokeWidth="4" strokeDasharray="8 6" />
      <path d="m495 221 11-15 11 15z" fill="#d4872f" />
      <text x="535" y="235" fill="#60717d" fontSize="13">API 呼叫與結果</text>
      <rect x="586" y="96" width="218" height="64" rx="14" fill="#ffffff" stroke="#0b938b" strokeWidth="2" />
      <text x="615" y="124" fill="#17283a" fontSize="14" fontWeight="750">Process Handle</text>
      <text x="615" y="145" fill="#60717d" fontSize="11">代表一組受檢查的存取權</text>
      <text x="112" y="425" fill="#60717d" fontSize="13">PID 只是識別值；能否操作物件仍由安全性檢查決定。</text>
    </svg>
  );
}

function RansomwareFlowSvg() {
  return (
    <svg viewBox="0 0 920 470" role="img" aria-labelledby="ransom-title ransom-desc">
      <title id="ransom-title">勒索病毒混合式加密流程</title>
      <desc id="ransom-desc">
        檔案資料先以 AES 工作金鑰加密，AES 金鑰再以攻擊者持有的 RSA 公鑰包裝。
      </desc>
      <rect width="920" height="470" fill="#fff5ee" />
      <rect x="42" y="40" width="836" height="390" rx="28" fill="#ffffff" stroke="#eadbce" />
      <text x="78" y="86" fill="#8b592f" fontSize="14" fontWeight="800">RANSOMWARE WORKFLOW</text>

      <rect x="72" y="136" width="166" height="104" rx="17" fill="#f1f5f6" stroke="#b7c5cc" strokeWidth="2" />
      <text x="101" y="174" fill="#17283a" fontSize="16" fontWeight="800">檔案資料</text>
      <text x="101" y="203" fill="#60717d" fontSize="12">文件、圖片、資料庫</text>

      <rect x="326" y="118" width="206" height="140" rx="19" fill="#e3f5f1" stroke="#0b938b" strokeWidth="3" />
      <text x="365" y="157" fill="#0a7d74" fontSize="15" fontWeight="800">AES 工作金鑰</text>
      <text x="365" y="188" fill="#17283a" fontSize="18" fontWeight="800">加密大量檔案</text>
      <text x="365" y="218" fill="#60717d" fontSize="12">每把金鑰可逐檔或批次產生</text>

      <rect x="620" y="136" width="172" height="104" rx="17" fill="#f1f5f6" stroke="#b7c5cc" strokeWidth="2" />
      <text x="657" y="174" fill="#17283a" fontSize="16" fontWeight="800">加密檔案</text>
      <text x="657" y="203" fill="#60717d" fontSize="12">副檔名與畫面被改寫</text>

      <path d="M240 188h70" stroke="#0b938b" strokeWidth="4" />
      <path d="m298 180 14 8-14 8z" fill="#0b938b" />
      <path d="M534 188h70" stroke="#0b938b" strokeWidth="4" />
      <path d="m592 180 14 8-14 8z" fill="#0b938b" />

      <rect x="326" y="302" width="206" height="88" rx="17" fill="#fff1e7" stroke="#d4872f" strokeWidth="2" />
      <text x="365" y="334" fill="#9a5e27" fontSize="14" fontWeight="800">AES 金鑰</text>
      <text x="365" y="362" fill="#17283a" fontSize="15" fontWeight="750">以 RSA 公鑰包裝</text>
      <path d="M430 258v34" stroke="#d4872f" strokeWidth="4" />
      <path d="m421 282 9 13 9-13z" fill="#d4872f" />
      <rect x="610" y="302" width="226" height="88" rx="17" fill="#10243b" />
      <text x="641" y="334" fill="#f1bd7d" fontSize="14" fontWeight="800">攻擊者持有私鑰</text>
      <text x="641" y="363" fill="#ffffff" fontSize="15" fontWeight="750">受害者沒有解密金鑰</text>
      <path d="M534 346h62" stroke="#d4872f" strokeWidth="4" strokeDasharray="7 5" />
      <path d="m586 338 14 8-14 8z" fill="#d4872f" />
      <text x="72" y="305" fill="#60717d" fontSize="14">同時破壞備份與</text>
      <text x="72" y="329" fill="#60717d" fontSize="14">橫向移動，風險更高</text>
      <text x="72" y="373" fill="#8b592f" fontSize="13" fontWeight="750">防禦：離線、不可變備份</text>
      <text x="72" y="396" fill="#8b592f" fontSize="13" fontWeight="750">＋最低權限＋網路分段</text>
    </svg>
  );
}

function Variant({ variant }: { variant: string }) {
  if (variant === "symmetric-vs-asymmetric") return <SymmetricAsymmetricSvg />;
  if (variant === "windows-process-boundary") return <WindowsBoundarySvg />;
  if (variant === "ransomware-hybrid-flow") return <RansomwareFlowSvg />;
  return null;
}

export function LessonDiagrams({ images }: { images: LessonImage[] }) {
  const [zoomedImage, setZoomedImage] = useState<LessonImage | null>(null);

  useEffect(() => {
    if (!zoomedImage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomedImage]);

  return (
    <>
      {images.map((image) => (
        <figure key={image.id} className="lesson-diagram-section">
          <button
            type="button"
            className="diagram-button touch-target"
            onClick={() => setZoomedImage(image)}
            aria-label={`放大圖解：${image.alt}`}
          >
            {image.type === "inline-svg" ? (
              <Variant variant={image.variant} />
            ) : (
              <img src={image.src} alt={image.alt} loading="lazy" />
            )}
          </button>
          {(image.caption || image.alt) && (
            <figcaption className="diagram-caption">
              {image.caption ?? image.alt}
              <span className="ml-2 inline-flex items-center gap-1 text-[var(--accent-strong)]">
                <ZoomIn size={12} /> 點擊放大
              </span>
            </figcaption>
          )}
        </figure>
      ))}
      {zoomedImage &&
        createPortal(
          <div
            className="image-zoom-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="教材圖解放大檢視"
            onClick={() => setZoomedImage(null)}
          >
            <div
              className="image-zoom-dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="image-zoom-close"
                onClick={() => setZoomedImage(null)}
                aria-label="關閉放大圖解"
                autoFocus
              >
                <X size={20} />
              </button>
              {zoomedImage.type === "inline-svg" ? (
                <Variant variant={zoomedImage.variant} />
              ) : (
                <img src={zoomedImage.src} alt={zoomedImage.alt} />
              )}
              <p className="bg-white px-5 py-4 text-center text-xs leading-6 text-[#52616e]">
                {zoomedImage.caption ?? zoomedImage.alt}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
