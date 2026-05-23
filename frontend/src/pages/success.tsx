import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface VolunteerCardData {
  id: number;
  volunteerId: string;
  fullName: string;
  phone: string;
  unitId: number;
  unitName?: string | null;
  unit?: any;
  photoUrl?: string | null;
  status: string;
  approvedAt?: string | null;
  createdAt: string;
}

// دالة استخراج الحروف الأولى من الاسم ديناميكياً بخلفية ملكية
const getInitials = (fullName: string) => {
  if (!fullName) return "م";
  const nameParts = fullName.trim().split(/\s+/);
  const firstLetter = nameParts[0] ? nameParts[0][0] : "";
  const fatherLetter = nameParts[1] ? nameParts[1][0] : "";
  return `${firstLetter} ${fatherLetter}`.trim();
};

/* ----------------------------------------------------
  1. مكون البطاقة الرقمية الرسمية (بعد الاعتماد)
---------------------------------------------------- */
export function IDCard({ volunteer }: { volunteer: VolunteerCardData }) {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrValue = `${currentOrigin}/profile/${volunteer.volunteerId}`; 
  const qrColor = "991b1b"; 

  const formatCardDate = (dateString?: string | null) => {
    if (!dateString) return "قيد الانتظار";
    try {
      return new Date(dateString).toLocaleDateString("ar-EG");
    } catch (e) {
      return "قيد المعالجة";
    }
  };

  return (
    <div 
      id="id-card-render"
      className="relative w-[310px] min-h-[540px] rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden border-[3px] border-red-600 shrink-0 flex flex-col items-center p-6 text-center mx-auto bg-white select-none"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* الخلفية الزخرفية للهلال الأحمر */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="mesh-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 10 10 L 40 25 L 70 10 L 40 55 Z" fill="none" stroke="#ef4444" strokeWidth="0.5"/>
            <path d="M 10 70 L 40 55 L 70 70 Z" fill="none" stroke="#ef4444" strokeWidth="0.5"/>
            <circle cx="10" cy="10" r="1.5" fill="#ef4444"/>
            <circle cx="40" cy="25" r="1.5" fill="#ef4444"/>
            <circle cx="70" cy="10" r="1.5" fill="#ef4444"/>
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-pattern)"/>
        </svg>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-800 via-red-600 to-red-800 shadow-md"></div>

      {/* الترويسة والشعار */}
      <div className="relative z-10 w-full mb-4 mt-2 flex flex-col items-center">
        <div className="w-14 h-14 mb-2 flex items-center justify-center">
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
        <div className="text-[13px] text-gray-900 font-black leading-tight tracking-tight">جمعية الهلال الأحمر السوداني</div>
        <div className="text-[11px] text-red-700 font-bold">فرع ولاية الخرطوم</div>
        <div className="text-[10px] text-black font-black mt-0.5">مكتب طوارئ محلية جبل أولياء</div>
      </div>

      {/* الصورة الشخصية الدائرية بالكامل */}
      <div className="relative z-10 mb-6 mt-2">
        <div className="absolute inset-0 bg-red-500/5 blur-[25px] rounded-full scale-110"></div>
        <div className="relative w-28 h-28 rounded-full border-[5px] border-white shadow-xl p-0.5 bg-gradient-to-tr from-red-600 via-red-500 to-red-400 overflow-hidden mx-auto">
          <div className="w-full h-full rounded-full border border-white/20 overflow-hidden bg-white">
            {volunteer.photoUrl ? (
              <img src={volunteer.photoUrl} className="w-full h-full object-cover rounded-full" alt="Volunteer" />
            ) : (
              <div className="w-full h-full bg-[#991b1b] text-white flex items-center justify-center font-black text-xl tracking-wider rounded-full">
                {getInitials(volunteer.fullName)}
              </div>
            )}
          </div>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-5 py-1 rounded-full font-black border-2 border-white whitespace-nowrap shadow-md">
          بطاقة متطوع رقمية
        </div>
      </div>

      {/* صندوق البيانات النظيف */}
      <div className="relative z-10 w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-red-50 shadow-lg p-5 mb-3 overflow-hidden border-b-[4px] border-b-red-50/50">
        <div className="relative z-20 mb-5 text-right">
          <div className="text-[9px] text-gray-400 font-bold mb-0.5">الاسم الكامل للمتطوع</div>
          <div className="text-[17px] font-black text-gray-800 leading-tight">{volunteer.fullName}</div>
        </div>

        <div className="relative z-20 flex flex-row-reverse items-start justify-between border-t border-gray-100 pt-4">
          <div className="bg-white p-1 rounded-xl border border-red-100 shadow-sm shrink-0 ml-2">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qrValue)}&color=${qrColor}`}
              alt="QR Verification"
              className="w-[60px] h-[60px]"
            />
          </div>

          <div className="grid grid-cols-1 gap-y-3 text-right flex-1">
            <div>
              <div className="text-[8px] text-gray-400 font-bold mb-0.5">رقم المتطوع</div>
              <div className="text-[11px] font-black text-red-600 font-mono tracking-tight">{volunteer.volunteerId}</div>
            </div>
            <div>
              <div className="text-[8px] text-gray-400 font-bold mb-0.5">الوحدة الإدارية</div>
              <div className="text-[10px] font-black text-gray-700 truncate">
                {volunteer.unitName || "مكتب الطوارئ المركزي"}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 grid grid-cols-2 gap-x-2 mt-3 pt-3 border-t border-gray-50 text-right">
            <div>
              <div className="text-[8px] text-gray-400 font-bold mb-0.5">رقم الهاتف</div>
              <div className="text-[9px] font-black text-gray-700">{volunteer.phone}</div>
            </div>
            <div>
              <div className="text-[8px] text-gray-400 font-bold mb-0.5">تاريخ الاعتماد</div>
              <div className="text-[9px] font-black text-gray-700">
                {formatCardDate(volunteer.approvedAt || volunteer.createdAt)}
              </div>
            </div>
        </div>
      </div>

      <div className="relative z-10 w-full mt-auto">
        <div className="bg-red-600 text-white py-2.5 px-4 rounded-xl mb-2 shadow-sm text-center">
          <p className="text-[9px] font-black tracking-wide">معتمدة من مكتب طوارئ محلية جبل أولياء 2026</p>
        </div>
        <div className="text-[7px] text-gray-400 font-mono tracking-[0.3em] uppercase font-bold opacity-60 text-center">SRCS DIGITAL ID SYSTEM</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
  2. نافذة إرشادات حفظ البطاقة (Popup Modal)
---------------------------------------------------- */
export function CardScreenshotPopup({ volunteer, open, onClose }: { volunteer: VolunteerCardData; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[360px] p-4 bg-black/60 backdrop-blur-2xl border-none rounded-[3rem] shadow-none outline-none overflow-y-auto max-h-[95vh]" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mb-5 mt-1"></div>
          <div className="rounded-[3rem] overflow-hidden shadow-2xl scale-[0.98] border border-white/10">
            <IDCard volunteer={volunteer} />
          </div>
          <div className="w-full bg-gradient-to-br from-red-950 to-black text-white p-5 rounded-[2rem] mt-6 shadow-xl border border-red-900/30">
            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
              <p className="font-black text-sm tracking-tight">📸 خطوة هامة لحفظ البطاقة</p>
            </div>
            <div className="text-[12px] font-bold text-red-100/90 leading-relaxed space-y-1.5 text-right">
              <p>• يرجى عمل لقطة شاشة (Screenshot) الآن لحفظ البطاقة على موبايلك.</p>
              <p>• تأكد من ظهور كامل البطاقة والـ QR بوضوح لإبرازها عند الطلب  .</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-12 text-white/60 font-bold w-full hover:bg-white/5 mt-3 text-sm rounded-xl">إغلاق المعاينة</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------
  3. لوحة أدوات التحكم الخارجية والتنبيه الإداري المبدئي
---------------------------------------------------- */
function ActionControlPanel({ volunteerId, whatsappMessage }: { volunteerId: string, whatsappMessage: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(volunteerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-sm bg-white/95 backdrop-blur-md border border-red-900/20 rounded-[2rem] p-4 shadow-xl flex flex-col space-y-3 mt-1 text-right">
      
      {/* تنبيه ذكي يوضح طبيعة الرقم المبدئية */}
      <div className="text-[11px] font-bold text-amber-800 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-relaxed">
        ⚠️ <strong>تنويه هام:</strong> هذا الرقم يعتبر <strong>رقم متطوع مبدئي</strong>، وسيتم اعتماده رسمياً فور مراجعة البيانات وتأكيدها من قبل مكتب الإشراف.
      </div>

      <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
        <div className="text-right">
          <p className="text-[9px] text-slate-400 font-bold">رقم المتطوع المبدئي</p>
          <p className="text-sm font-black font-mono text-slate-700 tracking-tight">{volunteerId}</p>
        </div>
        <Button 
          onClick={handleCopy}
          size="sm"
          className={`rounded-lg font-bold text-xs h-9 px-3 transition-all ${copied ? 'bg-green-600 hover:bg-green-600' : 'bg-slate-900 hover:bg-slate-800'} text-white`}
        >
          {copied ? "✓ تم النسخ" : "📋 نسخ الرقم"}
        </Button>
      </div>

      <a 
        href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-black h-12 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-all hover:scale-[1.01] active:scale-95 w-full text-center"
      >
        <span>💬 دعوة باقي المتطوعين للتسجيل (واتساب)</span>
      </a>
    </div>
  );
}

/* ----------------------------------------------------
  4. لوحة تتبع المسار الميداني (موزونة هندسياً ومطابقة للمصطلحات)
---------------------------------------------------- */
function InstitutionalStatusStepper({ volunteer }: { volunteer: VolunteerCardData }) {
  return (
    <div className="w-full max-w-sm bg-black/20 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 text-right shadow-2xl relative overflow-hidden">
      
      <h2 className="font-black text-lg text-white mb-1 border-r-4 border-red-500 pr-2 leading-tight">متابعة حالة طلب الحصر</h2>
      <p className="text-[10px] text-red-200 font-bold mb-6 pr-3">مكتب طوارئ محلية جبل أولياء</p>
      
      {/* حاوية التايم لاين الموزونة هندسياً بالكامل */}
      <div className="relative pr-8 space-y-6 text-right">
        
        {/* الخط الرابط العمودي - متمركز تماماً في منتصف الدوائر (12px من اليمين) */}
        <div className="absolute right-[11px] top-2 bottom-2 w-[2px] bg-white/20 pointer-events-none"></div>
        
        {/* الخطوة 1 */}
        <div className="relative">
          <div className="absolute right-[-32px] top-0.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white/80 z-10 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <div>
            <h3 className="font-black text-[13px] text-white leading-tight">تأكيد استلام البيانات</h3>
            <p className="text-[11px] text-emerald-300 font-bold mt-0.5">تم حفظ استمارة الحصر الرقمي بنجاح </p>
          </div>
        </div>

        {/* الخطوة 2 */}
        <div className="relative">
          <div className="absolute right-[-32px] top-0.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white/80 z-10 shadow-lg shadow-red-900 animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          <div>
            <h3 className="font-black text-[13px] text-white leading-tight">المراجعة والتدقيق الإداري</h3>
            <p className="text-[11px] text-red-100/80 font-medium mt-1 leading-relaxed">
              ملفك الآن بطرف مشرفي مكتب طوارئ جبل أولياء لمراجعته والتأكد من صحة البيانات تمهيداً للاعتماد.
            </p>
          </div>
        </div>

        {/* الخطوة 3 */}
        <div className="relative opacity-50">
          <div className="absolute right-[-32px] top-0.5 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/30 z-10"></div>
          <div>
            <h3 className="font-bold text-[13px] text-white/70 leading-tight">إصدار العضوية والبطاقة الرقمية</h3>
            <p className="text-[10px] text-white/50 font-medium mt-0.5">سيتم تفعيل وبناء البطاقة الرسمية فور صدور الاعتماد من مكتب الإشراف.</p>
          </div>
        </div>
      </div>

      {/* بطاقة ملخص مريحة للمتطوع (تم حذف حقل الوحدة وتدوير الصورة) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 mt-5 flex flex-row-reverse items-center gap-3">
        <div className="w-12 h-12 rounded-full border border-white/20 shadow-sm overflow-hidden shrink-0 bg-white flex items-center justify-center">
          {volunteer.photoUrl ? (
            <img src={volunteer.photoUrl} className="w-full h-full object-cover rounded-full" alt="Volunteer Avatar" />
          ) : (
            <div className="w-full h-full bg-[#991b1b] text-white flex items-center justify-center font-black text-xs rounded-full">
              {getInitials(volunteer.fullName)}
            </div>
          )}
        </div>
        <div className="flex-1 text-right overflow-hidden">
          <p className="text-[14px] font-black text-white truncate leading-tight">{volunteer.fullName}</p>
          <p className="text-[10px] font-bold text-red-300 mt-1">تسجيل جديد في النظام الرقمي</p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------
  5. الصفحة الرئيسية الكبرى (الأحمر الملكي بالكامل)
---------------------------------------------------- */
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
  const whatsappMessage = `الحمد لله، قمت بتحديث بياناتي بنجاح في حصر مكتب طوارئ جبل أولياء لجمعية الهلال الأحمر السوداني. سارعوا بالتسجيل وتحديث بيانات الحصر عبر الرابط الرسمي التالي:\n${currentOrigin}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#6b0714] via-[#800c19] to-[#4a020b] py-8 px-4 flex flex-col items-center justify-center space-y-5 select-none" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      <div className="text-center space-y-2 max-w-md w-full flex flex-col items-center">
        
        {isApproved ? (
          <>
            <h1 className="text-xl font-black text-white tracking-tight">تهانينا، تم اعتماد هويتك الرسمية!</h1>
            <p className="text-xs text-red-100/70 font-bold max-w-xs">بطاقتك الرقمية جاهزة ومسجلة رسمياً الآن في النظام.</p>
            
            <div className="pt-3 transform transition-all">
              <IDCard volunteer={volunteer} />
            </div>

            <ActionControlPanel volunteerId={volunteer.volunteerId} whatsappMessage={whatsappMessage} />

            <div className="pt-3 w-full max-w-sm flex flex-col items-center space-y-2">
              <Button 
                size="lg" 
                onClick={() => setShowCard(true)} 
                className="bg-white text-red-900 hover:bg-slate-100 font-black h-12 rounded-xl shadow-xl text-sm w-full transition-all animate-[pulse_2.5s_infinite]"
              >
                 📸 فتح إرشادات حفظ كلقطة شاشة
              </Button>
              <Button 
                variant="ghost" 
                className="h-10 text-white/50 font-bold text-xs hover:bg-white/5 rounded-xl w-full"
                onClick={() => setLocation("/")}
              >
                العودة للرئيسية
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-white tracking-tight">تم استلام تسجيل بياناتك بنجاح</h1>
            <p className="text-xs text-red-100/70 font-bold max-w-xs">جاري مراجعة طلبك الآن من قبل مشرفي مكتب الطوارئ.</p>
            
            <div className="w-full pt-2 flex justify-center">
              <InstitutionalStatusStepper volunteer={volunteer} />
            </div>

            <ActionControlPanel volunteerId={volunteer.volunteerId} whatsappMessage={whatsappMessage} />
            
            <div className="flex items-center justify-center gap-3 pt-3 w-full max-w-sm">
              <Button 
                variant="outline" 
                className="rounded-xl h-12 font-black border-2 border-white/20 text-white flex-1 text-xs bg-white/5 hover:bg-white/10" 
                onClick={() => setLocation("/status")}
              >
                🔍 متابعة حالة الطلب
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-xl h-12 font-bold text-white/50 px-4 text-xs hover:bg-white/5" 
                onClick={() => setLocation("/")}
              >
                الرئيسية
              </Button>
            </div>
          </>
        )}
      </div>

      <CardScreenshotPopup volunteer={volunteer} open={showCard} onClose={() => setShowCard(false)} />
    </div>
  );
}
