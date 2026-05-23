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
  unit?: any; // إضافة مرونة لدعم قراءة الحقل بأكثر من صيغة من قاعدة البيانات
  photoUrl?: string | null;
  status: string;
  approvedAt?: string | null;
  createdAt: string;
}

// دالة استخراج الحروف الأولى من الاسم ديناميكياً بخلفية ملكية عريقة
const getInitials = (fullName: string) => {
  if (!fullName) return "م";
  const nameParts = fullName.trim().split(/\s+/);
  const firstLetter = nameParts[0] ? nameParts[0][0] : "";
  const fatherLetter = nameParts[1] ? nameParts[1][0] : "";
  return `${firstLetter} ${fatherLetter}`.trim();
};

// دالة ذكية لحل مشكلة قراءة اسم الوحدة من السيرفر بمختلف الاحتمالات
const resolveUnitName = (volunteer: VolunteerCardData) => {
  if (volunteer.unitName) return volunteer.unitName;
  if (typeof volunteer.unit === 'string') return volunteer.unit;
  if (volunteer.unit && typeof volunteer.unit === 'object' && volunteer.unit.name) return volunteer.unit.name;
  return "غير محدد";
};

// 1. مكون البطاقة الرقمية الرسمية الحصري (نظيف تماماً وجاهز للاسكرين شوت بدون أزرار مشوهة)
export function IDCard({ volunteer }: { volunteer: VolunteerCardData }) {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrValue = `${currentOrigin}/profile/${volunteer.volunteerId}`; 
  const qrColor = "991b1b"; // العنابي الرسمي للهلال الأحمر

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
      className="relative w-[320px] min-h-[550px] rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden border-[3px] border-red-600 shrink-0 flex flex-col items-center p-6 text-center mx-auto bg-white select-none"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* الخلفية الهندسية الرسمية */}
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
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-pattern)"/>
        </svg>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-800 via-red-600 to-red-800 shadow-md"></div>

      {/* الشعار والتروئيسة */}
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

      {/* الصورة الشخصية */}
      <div className="relative z-10 mb-8 mt-2">
        <div className="absolute inset-0 bg-red-500/5 blur-[25px] rounded-full scale-110"></div>
        <div className="relative w-32 h-32 rounded-full border-[5px] border-white shadow-2xl p-0.5 bg-gradient-to-tr from-red-600 via-red-500 to-red-400 overflow-hidden mx-auto">
          <div className="w-full h-full rounded-full border border-white/20 overflow-hidden bg-white">
            {volunteer.photoUrl ? (
              <img src={volunteer.photoUrl} className="w-full h-full object-cover" alt="Volunteer Face" />
            ) : (
              <div className="w-full h-full bg-[#991b1b] text-white flex items-center justify-center font-black text-2xl tracking-wider">
                {getInitials(volunteer.fullName)}
              </div>
            )}
          </div>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-6 py-1.5 rounded-full font-black border-2 border-white whitespace-nowrap shadow-xl">
          بطاقة متطوع رقمية
        </div>
      </div>

      {/* صندوق البيانات المركزي - نظيف ومصقول خالي من أزرار الـ UX */}
      <div className="relative z-10 w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-red-50 shadow-xl p-6 mb-4 overflow-hidden border-b-[4px] border-b-red-50/50">
        <div className="relative z-20 mb-6 text-right">
          <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">الاسم الكامل للمتطوع</div>
          <div className="text-[19px] font-black text-gray-800 leading-tight">{volunteer.fullName}</div>
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
              <div className="text-[12px] font-black text-red-600 font-mono tracking-tight">{volunteer.volunteerId}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-400 font-bold mb-0.5">الوحدة الميدانية</div>
              <div className="text-[11px] font-black text-gray-700 truncate">{resolveUnitName(volunteer)}</div>
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
        <div className="bg-red-600 text-white py-3 px-4 rounded-2xl mb-4 shadow-md text-center">
          <p className="text-[10px] font-black tracking-wide">معتمدة من مكتب طوارئ محلية جبل أولياء 2026</p>
        </div>
        <div className="text-[7px] text-gray-400 font-mono tracking-[0.5em] uppercase font-bold opacity-60 text-center">SRCS DIGITAL ID SYSTEM V2.0</div>
      </div>
    </div>
  );
}

// 2. نافذة عرض ومعاينة البطاقة للحفظ (Popup Modal)
export function CardScreenshotPopup({ volunteer, open, onClose }: { volunteer: VolunteerCardData; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[390px] p-4 bg-slate-900/40 backdrop-blur-2xl border-none rounded-[3.5rem] shadow-none outline-none overflow-y-auto max-h-[98vh]" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="w-16 h-1.5 bg-white/20 rounded-full mb-6 mt-2"></div>
          <div className="rounded-[3rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.4)] scale-[0.98] border border-white/10">
            <IDCard volunteer={volunteer} />
          </div>
          <div className="w-full bg-gradient-to-br from-red-900 to-red-950 text-white p-6 rounded-[2.5rem] mt-8 shadow-2xl border border-red-800/30">
            <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <p className="font-black text-md tracking-tight">إرشادات حفظ بطاقتك الميدانية</p>
            </div>
            <div className="text-[13px] font-bold text-red-100/90 leading-relaxed space-y-2 text-right">
              <p>• يرجى تصوير الشاشة الآن (Screenshot) لحفظ كارت الهوية الميداني بنجاح على هاتفك.</p>
              <p>• تأكد من وضوح كود الـ QR والبيانات لتقديمها لجهات الفحص الميداني التابعة للمحلية.</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-14 text-white/60 font-bold w-full hover:bg-white/5 mt-4 text-md rounded-2xl">إغلاق المعاينة</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 3. لوحة أدوات الرفاهية الخارجية المشتركة (تظهر خارج البطاقة تماماً لحفظ جمالية التصميم)
function ActionControlPanel({ volunteerId, whatsappMessage }: { volunteerId: string, whatsappMessage: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(volunteerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm flex flex-col space-y-3 mt-2">
      <div className="flex items-center justify-between bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100">
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold">رقم القيد الخاص بك</p>
          <p className="text-sm font-black font-mono text-slate-700 tracking-tight">{volunteerId}</p>
        </div>
        <Button 
          onClick={handleCopy}
          size="sm"
          className={`rounded-xl font-bold px-4 transition-all ${copied ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
        >
          {copied ? "✓ تم نسخ الرقم" : "📋 نسخ رقم القيد"}
        </Button>
      </div>

      <a 
        href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-black h-14 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95 w-full text-center"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.66.986 3.288 1.447 5.358 1.448 5.534 0 10.03-4.494 10.032-10.025.002-2.68-1.038-5.198-2.93-7.091c-1.892-1.892-4.41-2.931-7.097-2.932-5.54 0-10.036 4.494-10.04 10.027-.001 2.074.547 4.1 1.585 5.86l-.478 1.743 1.799-.472zm12.012-3.842c-.297-.149-1.758-.868-2.031-.967-.272-.098-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
        <span>دعوة زملائي للتسجيل عبر الواتساب</span>
      </a>
    </div>
  );
}

// 4. لوحة التايم لاين الاحترافية لصفحة الانتظار (بديل المربع الأصفر المزعج)
function InstitutionalStatusStepper({ volunteer }: { volunteer: VolunteerCardData }) {
  return (
    <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] p-6 text-right shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl pointer-events-none"></div>
      
      <h2 className="font-black text-xl text-slate-800 mb-2 border-r-4 border-red-600 pr-3 leading-tight">متابعة مسار الطلب الميداني</h2>
      <p className="text-xs text-slate-400 font-bold mb-6 pr-4">نظام الحصر والتحديث الرقمي لـ محلية جبل أولياء</p>
      
      {/* الستيبّـر التفاعلي الفخم */}
      <div className="space-y-6 relative pr-4 before:absolute before:right-7 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
        
        {/* الخطوة 1: مكتملة دوماً */}
        <div className="flex flex-row-reverse items-start gap-4 relative">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-lg shadow-green-200 border-4 border-white relative z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-[14px] text-slate-800 leading-tight">استلام بيانات الاستمارة الرقمية</h3>
            <p className="text-[11px] text-green-600 font-bold mt-0.5">تم الحفظ بنجاح في قاعدة البيانات المركزية</p>
          </div>
        </div>

        {/* الخطوة 2: قيد المعالجة الحالية */}
        <div className="flex flex-row-reverse items-start gap-4 relative">
          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-200 border-4 border-white relative z-10 animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-[14px] text-red-900 leading-tight">المطابقة والتدقيق الإداري</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
              جاري مراجعة طلبك الآن من قِبل مشرفي <span className="font-black text-red-700">مكتب طوارئ جبل أولياء</span> للتأكد من التسكين الصحيح.
            </p>
          </div>
        </div>

        {/* الخطوة 3: معلقة */}
        <div className="flex flex-row-reverse items-start gap-4 relative">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border-4 border-white relative z-10"></div>
          <div className="flex-1">
            <h3 className="font-bold text-[14px] text-slate-400 leading-tight">إصدار واعتماد بطاقة المتطوع الرقمية</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">تظهر البطاقة فوراً هنا وفي صفحة الحالة عند تغيير الوضعية.</p>
          </div>
        </div>
      </div>

      {/* ملخص كارت المراجعة الصغير السفلي */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-6 flex flex-row-reverse items-center gap-4">
        <div className="w-16 h-16 rounded-xl border-2 border-white shadow-sm overflow-hidden shrink-0 bg-white flex items-center justify-center">
          {volunteer.photoUrl ? (
            <img src={volunteer.photoUrl} className="w-full h-full object-cover" alt="Review Avatar" />
          ) : (
            <div className="w-full h-full bg-[#991b1b] text-white flex items-center justify-center font-black text-md">
              {getInitials(volunteer.fullName)}
            </div>
          )}
        </div>
        <div className="flex-1 text-right overflow-hidden">
          <p className="text-[14px] font-black text-slate-800 truncate leading-tight">{volunteer.fullName}</p>
          <p className="text-[11px] font-bold text-red-700 mt-1 bg-red-50 px-2.5 py-0.5 rounded-md inline-block">
             وحدة: {resolveUnitName(volunteer)}
          </p>
        </div>
      </div>
    </div>
  );
}

// 5. الصفحة الرئيسية لـ نجاح الاستلام والتسجيل (المظهر المؤسسي الشامل)
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
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappMessage = `الحمد لله، قمت بتسجيل وتحديث بياناتي بنجاح في حصر مكتب طوارئ جبل أولياء لجمعية الهلال الأحمر السوداني. سارعوا بالتسجيل وتحديث بيانات الحصر الميداني عبر الرابط الرسمي التالي:\n${currentOrigin}`;

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 flex flex-col items-center justify-center space-y-6 selection:bg-red-200" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      <div className="text-center space-y-3 max-w-xl w-full flex flex-col items-center">
        {/* أيقونة النجاح العلوية الاحترافية */}
        <div className="w-16 h-16 bg-gradient-to-tr from-green-600 to-emerald-400 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-green-100 animate-bounce mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
        </div>

        {isApproved ? (
          <>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تم اعتماد وبناء الهوية بنجاح</h1>
            <p className="text-sm text-slate-500 font-bold max-w-sm">بطاقتك الرقمية الميدانية جاهزة ومسجلة رسمياً الآن في النظام الإلكتروني.</p>
            
            {/* عرض البطاقة النظيفة مباشرة */}
            <div className="pt-4 transition-all duration-300 transform">
              <IDCard volunteer={volunteer} />
            </div>

            {/* صندوق الأدوات المستقل تحت الكارت مباشرة */}
            <ActionControlPanel volunteerId={volunteer.volunteerId} whatsappMessage={whatsappMessage} />

            {/* الأزرار التنفيذية السفلية */}
            <div className="pt-4 w-full max-w-md flex flex-col items-center space-y-3">
              <Button 
                size="lg" 
                onClick={() => setShowCard(true)} 
                className="bg-red-600 hover:bg-red-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-red-100 text-lg w-full transition-all hover:scale-[1.01] animate-[pulse_3s_infinite]"
              >
                 📱 فتح إرشادات حفظ البطاقة
              </Button>
              <Button 
                variant="ghost" 
                className="h-12 text-slate-400 font-bold text-sm hover:bg-transparent"
                onClick={() => setLocation("/")}
              >
                العودة للرئيسية
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تم إرسال طلب الحصر بنجاح</h1>
            <p className="text-sm text-slate-500 font-bold max-w-xs">شكراً لتحديث بياناتك. طلبك متاح حالياً للمطابقة الفورية.</p>
            
            {/* لوحة التايم لاين المؤسسية الفخمة كبديل للأصفر */}
            <div className="w-full pt-2 flex justify-center">
              <InstitutionalStatusStepper volunteer={volunteer} />
            </div>

            {/* صندوق الأدوات لراحة متطوع الانتظار أيضاً */}
            <ActionControlPanel volunteerId={volunteer.volunteerId} whatsappMessage={whatsappMessage} />
            
            {/* أزرار التنقل لصفحة الانتظار */}
            <div className="flex items-center justify-center gap-3 pt-4 w-full max-w-md">
              <Button 
                variant="outline" 
                className="rounded-2xl h-14 font-black border-2 border-slate-200 text-slate-700 flex-1 text-sm bg-white hover:bg-slate-50" 
                onClick={() => setLocation("/status")}
              >
                🔍 متابعة حالة الطلب
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-2xl h-14 font-bold text-slate-400 px-4 text-sm" 
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
