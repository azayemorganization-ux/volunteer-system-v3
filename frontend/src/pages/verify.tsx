import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { useLocation } from "wouter"; // التعديل الذهبي المتوافق مع مشروعك الحالي

type ScanMethod = "camera" | "file" | "manual";

export default function AdvancedScannerPage() {
  const [, setLocation] = useLocation(); // استخدام راوتر مشروعك الأساسي بالتوجيه السلس
  const [method, setMethod] = useState<ScanMethod>("camera");
  const [digits, setDigits] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. تشغيل ماسح الكاميرا الـ Live
  useEffect(() => {
    if (method !== "camera") return;

    const scanner = new Html5QrcodeScanner(
      "camera-reader",
      { fps: 15, qrbox: { width: 220, height: 220 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        triggerSuccessEffect(decodedText);
      },
      (error) => { /* فحص صامت في الخلفية */ }
    );

    return () => {
      scanner.clear().catch((err) => console.error("بريك الكاميرا:", err));
    };
  }, [method]);

  // 🔥 الدالة الموحدة لمعالجة وتوجيه كل خيارات الفحص لنفس الرابط الداخلي
  const triggerSuccessEffect = (scannedOutput: string) => {
    setIsProcessing(true);
    setScanStatus({ text: "🎉 تم التحقق الرقمي بنجاح! جاري الانتقال لملف المتطوع...", isError: false });
    
    setTimeout(() => {
      let volunteerId = scannedOutput.trim();

      // الفلتر الذكي: لو المقروء عبارة عن رابط كامل، بنقصه عشان نطلع رقم المتطوع المكتوب في آخره بس
      if (volunteerId.startsWith("http")) {
        const parts = volunteerId.split("/").filter(part => part.length > 0);
        volunteerId = parts[parts.length - 1]; // بياخذ الجزء الأخير الممثل لرقم المتطوع
      }

      // التوجيه الداخلي الموحد عبر wouter بدون ريفريش يضايق المستخدم
      setLocation(`/profile/${volunteerId}`);
    }, 1500);
  };

  // 2. معالجة رفع صورة البطاقة (قراءة حقيقية من الملف)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);
      setScanStatus({ text: "📸 جاري مسح وقراءة صورة البطاقة بالليزر...", isError: false });

      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("file-scan-buffer");
          const decodedText = await html5QrCode.scanFile(file, true);
          triggerSuccessEffect(decodedText);
        } catch (err) {
          setIsProcessing(false);
          setScanStatus({ 
            text: "❌ تعذر العثور على رمز QR واضح في الصورة. تأكد من وضوح الإضاءة أو جرب البحث اليدوي.", 
            isError: true 
          });
        }
      }, 1500);
    }
  };

  // 3. البحث اليدوي المربوط بنفس دالة النجاح والتأثيرات
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.length !== 4) return;

    // تركيب الرقم بنفس الصيغة المتوقعة في السجلات والروابط العندك
    const fullId = `SRCS-2026-${digits}`;
    triggerSuccessEffect(fullId);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      <style>{`
        @keyframes laserMove {
          0% { top: 0%; opacity: 1; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 1; }
        }
        .animate-laser { animation: laserMove 2s linear infinite; }
      `}</style>

      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div id="file-scan-buffer" className="hidden"></div>

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 relative z-10">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-2xl border border-red-500/30 text-red-500 text-3xl mb-3 shadow-lg">
            ❤️
          </div>
          <h2 className="text-xl font-black tracking-wide text-white">بوابة التدقيق الرقمية</h2>
          <p className="text-xs text-slate-400 mt-1">جمعية الهلال الأحمر السوداني - جبل أولياء</p>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6">
          {(["camera", "file", "manual"] as ScanMethod[]).map((m) => (
            <button
              key={m}
              disabled={isProcessing}
              onClick={() => { setMethod(m); setScanStatus(null); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                method === m
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]"
                  : "text-slate-400 hover:text-slate-200 disabled:opacity-50"
              }`}
            >
              {m === "camera" && "📷 كاميرا لايف"}
              {m === "file" && "🖼️ رفع صورة"}
              {m === "manual" && "🔢 رقم القيد"}
            </button>
          ))}
        </div>

        <div className="min-h-[260px] flex flex-col justify-center relative bg-slate-950/40 rounded-2xl border border-slate-800 p-4 overflow-hidden">
          
          {isProcessing && (
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none z-30">
              <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent absolute shadow-[0_0_12px_#ef4444] animate-laser"></div>
            </div>
          )}

          {method === "camera" && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div id="camera-reader" className="w-full rounded-xl overflow-hidden text-slate-900 font-sans"></div>
              <p className="text-[11px] text-slate-500 text-center mt-3">ضع مربع الـ QR داخل إطار الكاميرا ليتم الفحص تلقائياً</p>
            </div>
          )}

          {method === "file" && (
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-red-500/50 bg-slate-950/60 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📥</div>
              <p className="text-sm font-bold text-slate-300">اضغط لإرفاق صورة البطاقة</p>
              <p className="text-xs text-slate-500 mt-1">قم برفع صورة واضحة للـ QR الموجود بالبطاقة</p>
            </div>
          )}

          {method === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4 w-full text-center p-2">
              <div className="text-center">
                <span className="text-xs text-slate-400 font-bold block mb-3">أدخل الأربعة أرقام الأخيرة من بطاقة المتطوع</span>
                
                <div className="flex items-center justify-center bg-slate-950 rounded-2xl border border-slate-700/80 p-2 max-w-[290px] mx-auto shadow-inner">
                  <span className="text-sm font-black tracking-wider text-slate-500 px-3 select-none border-l border-slate-800">
                    SRCS-2026-
                  </span>
                  <input
                    type="text"
                    maxLength={4}
                    value={digits}
                    onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
                    placeholder="0000"
                    disabled={isProcessing}
                    className="w-20 bg-transparent text-center text-xl font-black text-red-500 placeholder:text-slate-800 focus:outline-none tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || digits.length !== 4}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm py-3 rounded-xl transition-all duration-300 shadow-lg shadow-red-900/20"
              >
                {isProcessing ? "جاري التدقيق البصري..." : "فحص السجل الرقمي 🔍"}
              </button>
            </form>
          )}
        </div>

        {scanStatus && (
          <div className={`mt-4 p-3 rounded-xl text-center text-xs font-bold border transition-all ${
            scanStatus.isError
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            {scanStatus.text}
          </div>
        )}

      </div>
    </div>
  );
}
