import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";

export default function AdvancedScannerPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"camera" | "file" | "manual">("file");
  const [idInput, setIdInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [activeTab]);

  // معالجة قراءة وتحليل صورة البطاقة المرفوعة
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const html5QrCode = new Html5Qrcode("file-scanner-buffer");
      const result = await html5QrCode.scanFile(file, true);
      
      if (result) {
        extractAndNavigate(result);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("لم نتمكن من رصد رمز QR واضح بالبطاقة. تأكد من جودة الصورة والإضاءة.");
      setIsScanning(false);
    }
  };

  const extractAndNavigate = (text: string) => {
    const match = text.match(/SRCS-2026-\d+/i);
    if (match) {
      setLocation(`/profile/${match[0].toUpperCase()}`);
    } else {
      setErrorMessage("الرمز الممسوح غير مسجل في منظومة أكواد متطوعي المحلية.");
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idInput.length === 4) {
      setLocation(`/profile/SRCS-2026-${idInput}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 antialiased font-sans" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* الهيدر الحر المفتوح في الأعلى بدون قيود الصناديق */}
      <div className="w-full max-w-sm text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600 text-3xl mb-3 shadow-sm border border-red-100">
          ❤️
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">بوابة التدقيق الرقمية</h1>
        <p className="text-xs text-slate-500 mt-1 font-bold">جمعية الهلال الأحمر السوداني - جبل أولياء</p>
      </div>

      {/* 🛠️ لوحة الخيارات الحرة المستوية عالية التباين والوضوح */}
      <div className="w-full max-w-sm grid grid-cols-3 gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
        <button
          onClick={() => setActiveTab("camera")}
          className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-black transition-all duration-200 ${
            activeTab === "camera"
              ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span className="text-base">📷</span>
          <span>كاميرا لايف</span>
        </button>
        
        <button
          onClick={() => setActiveTab("file")}
          className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-black transition-all duration-200 ${
            activeTab === "file"
              ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span className="text-base">🖼️</span>
          <span>رفع صورة</span>
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-black transition-all duration-200 ${
            activeTab === "manual"
              ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span className="text-base">🔢</span>
          <span>رقم القيد</span>
        </button>
      </div>

      {/* ساحة العمل والعرض الحرة ذات التصميم الإنسيابي الموحد */}
      <div className="w-full max-w-sm space-y-4">

        {/* 1. مساحة عمل الكاميرا */}
        {activeTab === "camera" && (
          <div className="relative bg-white border border-slate-200 shadow-xl rounded-[2rem] overflow-hidden aspect-square flex flex-col items-center justify-center">
            <div id="camera-scanner-view" className="w-full h-full object-cover"></div>
            <div className="absolute inset-0 border-4 border-red-600/20 pointer-events-none rounded-[2rem] m-6 animate-pulse"></div>
          </div>
        )}

        {/* 2. مساحة رفع الملف المعززة بالمعاينة وخيط الليزر السينمائي المباشر */}
        {activeTab === "file" && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative bg-white border-2 border-dashed border-slate-300 hover:border-red-500 rounded-[2rem] shadow-xl overflow-hidden aspect-square flex flex-col items-center justify-center cursor-pointer group transition-all"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {imagePreview ? (
              <div className="w-full h-full relative p-3 bg-slate-50 flex items-center justify-center">
                <img src={imagePreview} alt="البطاقة المرفوعة" className="w-full h-full object-contain rounded-2xl shadow-inner" />
                
                {/* 💥 تأثير خط الليزر الأحمر المنطلق انسيابياً مباشرة فوق صورة البطاقة الحقيقية */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-[3px] bg-red-600 shadow-[0_0_15px_#dc2626] animate-[laser_2.5s_ease-in-out_infinite]"></div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 bg-red-50 text-red-600 text-3xl rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  📥
                </div>
                <p className="text-sm font-black text-slate-800">اضغط لإدراج صورة البطاقة</p>
                <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed font-medium">سيقوم النظام بمسح وقراءة رمز الـ QR تلقائياً من الصورة المرفقة</p>
              </div>
            )}
          </div>
        )}

        {/* 3. مساحة الإدخال اليدوي الموحدة الخط والوزن بنسبة 100% لراحة العين */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 shadow-xl rounded-[2rem] p-6 space-y-5">
            <p className="text-center text-xs text-slate-500 font-bold">أدخل الأرقام الأربعة الأخيرة المدرجة في بطاقة المتطوع</p>
            
            {/* 🛠️ إدخال موحد المقاس والخط الهندسي المتزن كلياً */}
            <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 font-mono text-xl tracking-wider text-center focus-within:border-red-500 focus-within:bg-white transition-all shadow-inner">
              <span className="text-slate-400 select-none font-black text-xl">SRCS-2026-</span>
              <input
                type="text"
                maxLength={4}
                placeholder="0000"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value.replace(/\D/g, ""))}
                className="bg-transparent text-slate-800 font-black w-16 focus:outline-none placeholder-slate-300 text-xl caret-red-600 mr-1 text-right"
              />
            </div>

            <button
              type="submit"
              disabled={idInput.length !== 4}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-red-600/10"
            >
              🔍 فحص السجل الميداني
            </button>
          </form>
        )}

        {/* التنبيهات ورسائل الخطأ بتصميم ناعم ومطابق للهوية الرسمية */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 text-center font-black leading-relaxed shadow-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* مؤشر المعالجة تحت اللوحة الحرة */}
        {isScanning && activeTab === "file" && (
          <p className="text-center text-xs text-emerald-600 font-bold animate-pulse">
            ⚙️ جاري مسح وقراءة بيانات البطاقة بالليزر الرقمي...
          </p>
        )}
      </div>

      {/* تذييل أمني يعزز الطابع الرسمي للمنظومة */}
      <div className="text-center mt-12 opacity-60">
        <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
          جمعية الهلال الأحمر السوداني - فرع ولاية الخرطوم <br/>
          نافذة التحقق الفوري الميدانية الموحدة 2026
        </p>
      </div>

      {/* بافر داخلي مخفي لمعالجة ملفات الـ QR برمجياً */}
      <div id="file-scanner-buffer" className="hidden"></div>

      {/* كود حقن حركة الليزر الانسيابية لضمان الأداء الفخم على الهواتف */}
      <style>{`
        @keyframes laser {
          0% { top: 5%; opacity: 0.4; }
          50% { top: 92%; opacity: 1; }
          100% { top: 5%; opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
