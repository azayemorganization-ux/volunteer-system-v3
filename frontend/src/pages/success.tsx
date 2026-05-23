import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface VolunteerCardData {
  id: number;
  volunteerId: string;
  fullName: string;
  phone: string;
  unitName?: string | null;
  photoUrl?: string | null;
  status: string;
  approvedAt?: string | null;
  createdAt: string;
}

// دالة استخراج الحروف الأولى من الاسم واسم الأب ديناميكياً
const getInitials = (fullName: string) => {
  if (!fullName) return "م";
  const nameParts = fullName.trim().split(/\s+/);
  const firstLetter = nameParts[0] ? nameParts[0][0] : "";
  const fatherLetter = nameParts[1] ? nameParts[1][0] : "";
  return `${firstLetter} ${fatherLetter}`.trim();
};

// 1. مكون البطاقة الرقمية الذكية (التصميم الأصلي الكامل مع الـ QR الديناميكي)
export function IDCard({ volunteer }: { volunteer: VolunteerCardData }) {
  // إنشاء رابط التحقق التلقائي بناءً على نطاق الموقع الحالي
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrValue = `${currentOrigin}/profile/${volunteer.volunteerId}`; 
  const qrColor = "991b1b"; // اللون العنابي للهلال الأحمر

  // [تعديل رفاهية] حالة وإجراء نسخ رقم القيد إلى الحافظة تلقائياً
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(volunteer.volunteerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // دالة تنسيق التاريخ الآمنة
  const formatCardDate = (dateString?: string | null) => {
    if (!dateString) return "معلق";
    try {
      return new Date(dateString).toLocaleDateString("ar-EG");
    } catch (e) {
      return "غير محدد";
    }
  };

  return (
    <div 
      id="id-card-render"
      className="relative w-[320px] min-h-[550px] rounded-[3rem] shadow-2xl overflow-hidden border-[3px] border-red-600 shrink-0 flex flex-col items-center p-6 text-center mx-auto bg-white"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* الخلفية والزخارف الهندسية - بدون تعديل */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="mesh-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 10 10 L 40 25 L 70 10 L 40 55 Z" fill="none" stroke="#ef4444" strokeWidth="0.5"/>
            <path d="M 10 70 L 40 55 L 70 70 Z" fill="none" stroke="#ef4444" strokeWidth="0.5"/>
            <circle cx="10" cy="10" r="1.5" fill="#ef4444"/>
            <circle cx="40" cy="25" r="1.5" fill="#ef4444"/>
            <circle cx="70" cy="10" r="1.5" fill="#ef4444"/>
            <circle cx="40" cy="55" r="1.5" fill="#ef4444"/>
            <circle cx="10" cy="70" r="1.5" fill="#ef4444"/>
            <circle cx="70" cy="70" r="1.5" fill="#ef4444"/>
            <line x1="10" y1="10" x2="10" y2="70" stroke="#ef4444" strokeWidth="0.3" strokeDasharray="2 2"/>
            <line x1="70" y1="10" x2="70" y2="70" stroke="#ef4444" strokeWidth="0.3" strokeDasharray="2 2"/>
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-pattern)"/>
        </svg>
      </div>
      
      <div className="absolute top-40 right-2 w-12 h-12 rounded-full border border-red-100/40 opacity-70 pointer-events-none"></div>
      <div className="absolute bottom-60 left-4 w-6 h-6 rounded-full border-2 border-red-50/40 opacity-70 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-800 via-red-600 to-red-800 shadow-md"></div>

      {/* الترويسة والشعار الرسمي - بدون تعديل */}
      <div className="relative z-10 w-full mb-4 mt-4 flex flex-col items-center">
        <div className="w-16 h-16 mb-2 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#c10d28] drop-shadow-md" fill="currentColor">
            <defs>
              <mask id="final-perfect-moon">
                <circle cx="50" cy="50" r="40" fill="white" />
                <circle cx="65" cy="50" r="35" fill="black" />
              </mask>
            </defs>
            <circle cx="50" cy="50" r="40" mask="url(#final-perfect-moon)" />
          </svg>
        </div>
        <div className="text-[14px] text-gray-900 font-black leading-tight tracking-tight">جمعية الهلال الأحمر السوداني</div>
        <div className="text-[12px] text-red-700 font-bold">فرع ولاية الخرطوم</div>
        <div className="text-[11px] text-black font-black mt-0.5">مكتب طوارئ محلية جبل أولياء</div>
      </div>

      {/* الصورة الشخصية بإطار الهوية - [تعديل] تظهر الحروف باللون العنابي الملكي عند عدم رفع صورة */}
      <div className="relative z-10 mb-8 mt-2">
        <div className="absolute inset-0 bg-red-500/5 blur-[25px] rounded-full scale-110"></div>
        <div className="relative w-32 h-32 rounded-full border-[5px] border-white shadow-2xl p-0.5 bg-gradient-to-tr from-red-600 via-red-500 to-red-400 overflow-hidden mx-auto">
          <div className="w-full h-full rounded-full border border-white/20 overflow-hidden bg-white">
            {volunteer.photoUrl ? (
              <img src={volunteer.photoUrl} className="w-full h-full object-cover" alt="Volunteer Face" />
            ) : (
              <div className="w-full h-full bg-[#991b1b] text-white flex items-center justify-center font-black text-2xl tracking-wider select-none">
                {getInitials(volunteer.fullName)}
              </div>
            )}
          </div>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-6 py-1.5 rounded-full font-black border-2 border-white whitespace-nowrap shadow-xl">
          بطاقة متطوع رقمية
        </div>
      </div>

      {/* صندوق البيانات المركزي - [تعديل] إضافة زر نسخ رقم القيد والديناميكية للوحدة */}
      <div className="relative z-10 w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-red-50 shadow-xl p-6 mb-4 overflow-hidden border-b-[4px] border-b-red-50/50">
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-red-600/5 rounded-full"></div>
        
        <div className="relative z-20 mb-6 text-right">
          <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">الاسم الكامل للمتطوع</div>
          <div className="text-[19px] font-black text-gray-800 leading-tight ">{volunteer.fullName}</div>
        </div>

        <div className="relative z-20 flex flex-row-reverse items-start justify-between border-t border-gray-100 pt-5">
          <div className="bg-white p-1.5 rounded-2xl border border-red-100 shadow-sm shrink-0 ml-2">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=65x65&data=${encodeURIComponent(qrValue)}&color=${qrColor}`}
              alt="QR Verification"
              className="w-[68px] h-[68px]"
            />
          </div>

          <div className="grid grid-cols-1 gap-y-4 text-right flex-1">
            <div>
              <div className="text-[9px] text-gray-400 font-bold mb-0.5">رقم القيد المتطوع</div>
              {/* زر نسخ رقم القيد السريع لراحة المتطوع */}
              <div className="flex items-center gap-2 justify-end">
                <div className="text-[11px] font-black text-red-600 font-mono tracking-tight">{volunteer.volunteerId}</div>
                <button 
                  onClick={handleCopy} 
                  className="text-gray-400 hover:text-red-700 text-[10px] font-bold border border-gray-100 px-1.5 py-0.5 rounded-md bg-gray-50/50 active:scale-95 transition-all"
                  title="نسخ رقم القيد"
                >
                  {copied ? "✓ تم" : "📋 نسخ"}
                </button>
              </div>
            </div>
            <div>
              <div className="text-[9px] text-gray-400 font-bold mb-0.5">الوحدة الميدانية</div>
              {/* عرض الوحدة الفعلية المختارة بديناميكية تامة */}
              <div className="text-[11px] font-black text-gray-700 truncate">{volunteer.unitName || "غير محدد"}</div>
            </div>
          </div>
        </div>

        <div className="relative z-20 grid grid-cols-2 gap-x-2 mt-4 pt-4 border-t border-gray-50 text-right">
            <div>
              <div className="text-[9px] text-gray-400 font-bold mb-0.5">رقم الهاتف</div>
              <div className="text-[10px] font-black text-gray-700">{volunteer.phone}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-400 font-bold mb-0.5">تاريخ الاعتماد</div>
              <div className="text-[10px] font-black text-gray-700">
                {formatCardDate(volunteer.approvedAt || volunteer.createdAt)}
              </div>
            </div>
        </div>
      </div>

      <div className="relative z-10 w-full mt-auto">
        <div className="bg-red-600 text-white py-3 px-4 rounded-2xl mb-4 shadow-lg text-center">
          <p className="text-[10px] font-black tracking-wide">معتمدة من مكتب طوارئ محلية جبل أولياء 2026</p>
        </div>
        <div className="text-[7px] text-gray-400 font-mono tracking-[0.5em] uppercase font-bold opacity-60 text-center">SRCS DIGITAL ID SYSTEM V2.0</div>
      </div>
    </div>
  );
}

// 2. نافذة عرض ومعاينة البطاقة للحفظ (Popup Modal) - بدون تعديل
export function CardScreenshotPopup({ volunteer, open, onClose }: { volunteer: VolunteerCardData; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[390px] p-4 bg-white/95 backdrop-blur-2xl border-none rounded-[3.5rem] shadow-none outline-none overflow-y-auto max-h-[98vh]" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-6 mt-2"></div>
          <div className="rounded-[3rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] scale-[0.98] border border-gray-100">
            <IDCard volunteer={volunteer} />
          </div>
          <div className="w-full bg-red-700 text-white p-6 rounded-[2.5rem] mt-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-3 border-b border-white/20 pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <p className="font-black text-lg tracking-tight">إرشادات حفظ البطاقة</p>
            </div>
            <div className="text-[14px] font-bold opacity-95 leading-relaxed space-y-2">
              <p>• يرجى أخذ لقطة للشاشة (Screenshot) الآن لحفظ البطاقة الرقمية على جهازك.</p>
              <p>• ننصح بقص حواف الصورة لاحقاً مع التأكد من ظهور كامل تفاصيل البطاقة والـ QR Code بوضوح للاستخدام الرسمي الميداني.</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-14 text-gray-400 font-bold w-full hover:bg-transparent mt-2 text-lg">إغلاق المعاينة</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 3. الصفحة الرئيسية للنجاح بعد التسجيل مباشرة
export default function Success() {
  const [, setLocation] = useLocation();
  const [volunteer, setVolunteer] = useState<VolunteerCardData | null>(null);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("volunteerData");
    if (data) {
      try { 
        const parsed = JSON.parse(data);
        setVolunteer({ id: parsed.id || 0, ...parsed }); 
      }
      catch { 
        setLocation("/"); 
      }
    } else { 
      setLocation("/"); 
    }
  }, [setLocation]);

  if (!volunteer) return null;

  const isApproved = volunteer.status === "approved";

  // تحضير رسالة الدعوة والربط المخصص للواتساب ديناميكياً
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappMessage = `الحمد لله، قمت بتسجيل وتحديث بياناتي بنجاح في حصر مكتب طوارئ جبل أولياء لجمعية الهلال الأحمر السوداني. سارعوا بالتسجيل وتحديث بيانات الحصر الميداني عبر الرابط الرسمي التالي:\n${currentOrigin}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 flex flex-col items-center justify-center space-y-8" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="text-center space-y-4 max-w-xl w-full">
        <div className="w-20 h-20 bg-green-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
        </div>

        {isApproved ? (
          <>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">تم الاعتماد بنجاح</h1>
            <p className="text-gray-500 font-medium">بطاقتكم الرقمية جاهزة ومسجلة في النظام للاستخدام الفوري.</p>
            <div className="pt-8">
              {/* [تعديل رفاهية] إضافة أنيميشن النبض الهادئ لجذب الانتباه للزر الأساسي */}
              <Button 
                size="lg" 
                onClick={() => setShowCard(true)} 
                className="bg-red-600 hover:bg-red-700 text-white font-black h-16 px-12 rounded-[1.5rem] shadow-2xl transition-all hover:scale-105 text-xl w-full max-w-xs mx-auto block animate-[pulse_3s_infinite]"
              >
                 عرض البطاقة الرقمية
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">تم استلام طلبك بنجاح</h1>
            <div className="bg-amber-50 border border-amber-200 rounded-[2.5rem] p-6 text-amber-900 text-right shadow-sm mt-6">
              <p className="font-black text-xl mb-2 text-amber-950 underline decoration-amber-300 underline-offset-8 leading-loose">شكراً لتسجيل بياناتك في الحصر</p>
              <p className="text-lg font-bold leading-relaxed mb-6">سيتم مراجعة طلبك وإصدار بطاقتك الرقمية الرسمية فور اعتماد البيانات من مكتب طوارئ جبل أولياء.</p>
              
              <div className="bg-white/80 backdrop-blur-sm border border-amber-200/50 rounded-3xl p-5 mt-4 flex flex-row-reverse items-center gap-5 shadow-inner">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden shrink-0 bg-white flex items-center justify-center">
                  {volunteer.photoUrl ? (
                    <img src={volunteer.photoUrl} className="w-full h-full object-cover" alt="Review Avatar" />
                  ) : (
                    /* [تعديل] تظهر الحروف باللون العنابي الملكي هنا أيضاً في صندوق الانتظار */
                    <div className="w-full h-full bg-[#991b1b] text-white flex items-center justify-center font-black text-xl select-none">
                      {getInitials(volunteer.fullName)}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-right overflow-hidden">
                  <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest mb-1 opacity-70">البيانات المرفوعة للمطابقة:</p>
                  <p className="text-lg font-black text-amber-950 truncate leading-tight">{volunteer.fullName}</p>
                  {/* [تعديل] تظهر هنا الوحدة المعبأة في الاستمارة ديناميكياً بالكامل */}
                  <p className="text-sm font-bold text-amber-800 mt-2 bg-amber-100/50 px-3 py-1 rounded-full inline-block tracking-tight">الوحدة: {volunteer.unitName || "غير محدد"}</p>
                </div>
              </div>
              <div className="bg-amber-100/40 p-4 rounded-2xl mt-6 border border-amber-200/30">
                <p className="text-sm font-black text-amber-800 leading-snug">يمكنك حفظ هذه الصفحة أو الرجوع في أي وقت عبر إدخال رقمك الوطني في صفحة "متابعة الحالة" للتحقق من صدور الكارنيه.</p>
              </div>
            </div>
            
            {/* صف الأزرار مع زر المشاركة الفاخر في الواتساب */}
            <div className="flex flex-wrap justify-center gap-4 pt-8 w-full">
              <Button 
                variant="outline" 
                className="rounded-2xl px-8 h-14 font-black border-2 border-gray-200 text-gray-700 flex-1 min-w-[130px] max-w-[170px]" 
                onClick={() => setLocation("/status")}
              >
                متابعة الحالة
              </Button>
              
              {/* [تعديل رفاهية] زر النشر الفوري في جروبات الواتساب لاستقطاب باقي المتطوعين */}
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-black h-14 px-5 rounded-2xl flex items-center justify-center gap-2 text-[14px] shadow-lg transition-all hover:scale-105 flex-1 min-w-[160px] max-w-[210px] text-center"
              >
                <span>💬 انشر في الواتساب</span>
              </a>

              <Button 
                variant="ghost" 
                className="rounded-2xl px-4 h-14 font-bold text-gray-400" 
                onClick={() => setLocation("/")}
              >
                الرئيسية
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
