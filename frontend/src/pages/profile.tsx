import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchPublicVolunteer } from "@/lib/api";

// تعريف دقيق للبيانات القادمة من التحقق العام
interface PublicVolunteerData {
  volunteerId: string;
  fullName: string;
  sectorName?: string | null;
  unitName?: string | null;
  photoUrl?: string | null;
  status: string;
}

export default function ProfilePage() {
  // 1. استخراج معرف المتطوع من الرابط بشكل آمن
  const [, params] = useRoute("/profile/:id");
  const id = params?.id || "";

  // 2. إدارة حالة البيانات والتحميل
  const [volunteer, setVolunteer] = useState<PublicVolunteerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError(true);
      return;
    }
    
    setIsLoading(true);
    setError(false);
    
    fetchPublicVolunteer(id)
      .then((data) => {
        if (data) {
          setVolunteer(data as PublicVolunteerData);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  // 3. واجهة جاري التحميل (شاشة الانتظار الميدانية)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto" />
          <p className="font-bold text-slate-600 text-sm tracking-wide">جاري فحص قاعدة البيانات المركزية...</p>
        </div>
      </div>
    );
  }

  // 4. واجهة الخطأ: السجل غير نشط أو تم تزويره
  if (error || !volunteer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50" dir="rtl">
        <Card className="p-8 text-center border-t-8 border-red-600 shadow-2xl max-w-sm w-full rounded-[2rem]">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-black text-gray-900 mb-2">عفواً! بيانات غير مطابقة</h3>
          <p className="text-gray-600 font-bold mb-4">
            معرف المتطوع: <span className="text-red-600 font-mono tracking-wider">({id})</span>
          </p>
          <div className="text-xs text-slate-600 bg-red-50/50 border border-red-100 p-4 rounded-2xl leading-relaxed font-bold">
            هذا المعرف الرقمي غير مدرج في قوائم الاعتماد النشطة حالياً.
            <br/> 
            يرجى حجز الكارنيه وتوجيه الحامل لمراجعة مكتب تقنية معلومات طوارئ جبل أولياء.
          </div>
        </Card>
      </div>
    );
  }

  // 5. واجهة الاعتماد الرسمية والناجحة عند فحص الـ QR Code
  return (
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-center font-sans" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* كارت التحقق الذكي للجهات الرسمية */}
      <Card className="w-full max-w-sm border-t-[12px] border-red-600 rounded-[2.5rem] shadow-2xl bg-white overflow-hidden relative">
        
        {/* شعار الهلال الأحمر في الخلفية كعلامة مائية أمنية */}
        <div className="absolute top-4 left-4 w-12 h-12 opacity-5 pointer-events-none">
          <svg viewBox="0 0 100 100" fill="currentColor" className="text-red-600">
            <path d="M 50 10 A 40 40 0 0 0 50 90 A 40 40 0 0 0 80 50 A 35 35 0 0 1 50 80 A 35 35 0 0 1 50 20 A 35 35 0 0 1 80 50 A 40 40 0 0 0 50 10 Z" />
          </svg>
        </div>

        <CardHeader className="pb-2 text-center relative z-10 mt-4">
          {/* الصورة الشخصية المعتمدة في السيرفر */}
          <div className="w-32 h-32 bg-slate-50 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white shadow-md relative">
            {volunteer.photoUrl ? (
              <img src={volunteer.photoUrl} alt="Volunteer Official Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-100 text-slate-300 text-lg font-black tracking-widest italic">
                SRCS
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 leading-tight px-4 mb-2">
            {volunteer.fullName}
          </h2>
          
          <div className="inline-block bg-red-50 px-5 py-1 rounded-full border border-red-100 shadow-sm">
            <p className="text-red-600 font-mono font-black text-xs tracking-widest">
              ID: {volunteer.volunteerId}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6 pb-8 mt-2 relative z-10">
          
          {/* تفاصيل التوزيع الميداني (القطاع والوحدة) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-black block mb-0.5">القطاع المعتمد</span>
              <span className="text-sm font-black text-slate-700">{volunteer.sectorName || "جبل أولياء"}</span>
            </div>
            <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-black block mb-0.5">الوحدة التطوعية</span>
              <span className="text-sm font-black text-slate-700 truncate">{volunteer.unitName || "مكتب الطوارئ"}</span>
            </div>
          </div>

          {/* شارة التوثيق والختم الأخضر اللامع */}
          <div className="flex items-center justify-center gap-2.5 bg-emerald-50 text-emerald-800 py-4 rounded-[1.5rem] font-black border border-emerald-200 shadow-sm transition-transform hover:scale-[1.02]">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <span className="text-lg tracking-tight">قيد المتطوع نشط ومعتمد</span>
          </div>

          {/* التذييل الأمني */}
          <div className="text-center pt-4 border-t border-slate-100 opacity-70">
             <p className="text-[9px] text-slate-500 leading-relaxed font-bold">
               جمعية الهلال الأحمر السوداني - فرع ولاية الخرطوم <br/>
               نافذة التحقق الفوري الميدانية الموحدة 2026
             </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-slate-400 text-[10px] font-bold tracking-wider">SRCS DIGITAL VERIFICATION SYSTEM V2.0</p>
    </div>
  );
}
