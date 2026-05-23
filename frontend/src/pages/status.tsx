import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDCard, CardScreenshotPopup, type VolunteerCardData } from "./success";
import { checkVolunteerStatus } from "@/lib/api";

interface StatusData extends VolunteerCardData {
  status: string;
  rejectionReason?: string | null;
  approvedAt?: string;
  createdAt: string;
}

export default function StatusCheck() {
  const [, setLocation] = useLocation();
  const [nationalId, setNationalId] = useState("");
  const [result, setResult] = useState<StatusData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const handleCheck = async () => {
    if (!nationalId.trim()) { 
      setError("يرجى إدخال الرقم الوطني بشكل صحيح"); 
      return; 
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await checkVolunteerStatus(nationalId.trim());
      // تأمين البيانات وتمرير الـ id الافتراضي ليتوافق مع الـ Interface
      setResult({ id: data.id || 0, ...data } as StatusData);
    } catch (err: any) {
      if (err?.status === 404) {
        setError("لم يتم العثور على سجل بهذا الرقم الوطني. تأكد من صحة الرقم أو قم بتقديم طلب جديد.");
      } else {
        setError("حدث خطأ أثناء الاستعلام من السيرفر. يرجى المحاولة مجدداً.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isApproved = result?.status === "approved";
  const isRejected = result?.status === "rejected";

  // دالة مساعدة لتنسيق التواريخ بشكل آمن ومحلي
  const formatDate = (dateString?: string) => {
    if (!dateString) return "غير محدد";
    try {
      return new Date(dateString).toLocaleDateString("ar-EG", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-lg mb-8">
        {/* زر العودة للمنصة الرئيسية */}
        <button 
          onClick={() => setLocation("/")} 
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6 group transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-[4px] transition-transform"><path d="m9 18 6-6-6-6"/></svg>
          العودة للمنصة الرئيسية
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">مراجعة حالة طلبك</h1>
          <p className="text-muted-foreground text-sm mt-1">أدخل رقمك الوطني للاستعلام الفوري عن حالة اعتماد بياناتك</p>
        </div>

        {/* كارت الاستعلام */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">الرقم الوطني للمتطوع</label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="أدخل الرقم الوطني المكون من 11 خانة"
              value={nationalId}
              onChange={(e) => { 
                setNationalId(e.target.value.replace(/\D/g, "")); 
                setError(""); 
                setResult(null); 
              }}
              dir="ltr"
              className="text-right text-lg h-12 tracking-wider"
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            />
          </div>
          
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 border border-destructive/20 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <Button 
            onClick={handleCheck} 
            disabled={loading || !nationalId.trim()} 
            className="w-full h-12 text-base font-bold transition-all"
          >
            {loading ? "جاري البحث ..." : "استعلام عن الطلب "}
          </Button>
        </div>
      </div>

      {/* عرض نتائج الاستعلام في حال العثور على السجل */}
      {result && (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* حالة الطلب (مقبول / مرفوض / معلق) */}
          <div className={`rounded-xl border p-5 text-center shadow-sm ${isApproved ? "bg-green-50/70 border-green-200" : isRejected ? "bg-red-50/70 border-red-200" : "bg-amber-50/70 border-amber-200"}`}>
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-lg font-black mb-2 ${isApproved ? "bg-green-100 text-green-800" : isRejected ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
              {isApproved ? (
                <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>تهانينا .. تم اعتمادك رسمياً</>
              ) : isRejected ? (
                <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>لم يتم الاعتماد (مرفوض)</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>الطلب قيد المراجعة والمطابقة</>
              )}
            </div>
            <p className={`text-sm font-medium mt-1 leading-relaxed ${isApproved ? "text-green-700" : isRejected ? "text-red-700" : "text-amber-700"}`}>
              {isApproved
                ? `تم اعتماد وتوثيق طلبك برقم متطوع رسمي في تاريخ ${formatDate(result.approvedAt)}. بطاقتك الرقمية جاهزة للعرض والحفظ الآن.`
                : isRejected
                ? "تم رفض طلب الحصر الحالي لوجود نواقص في البيانات. يرجى مراجعة سبب الرفض الموضح أدناه."
                : "طلبك قيد المراجعة والتدقيق الآن من قبل مكتب طوارئ جبل أولياء. يتم تحديث واعتماد الطلبات دورياً خلال 24 ساعة."}
            </p>
          </div>

          {/* عرض سبب الرفض في حال كان الطلب مرفوضاً */}
          {isRejected && result.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <div>
                  <p className="font-bold text-red-900 mb-1">توجيهات مكتب الطوارئ بخصوص الرفض:</p>
                  <p className="text-red-700 text-sm leading-relaxed">{result.rejectionReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* بطاقة تفاصيل المتطوع الأساسية في النظام */}
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              {result.photoUrl ? (
                <img src={result.photoUrl} alt="صورة المتطوع الرسمية" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shadow shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0 border border-muted-foreground/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              )}
              <div>
                <div className="font-black text-lg text-foreground">{result.fullName}</div>
                <div className="text-primary font-mono text-xs font-bold mt-0.5 tracking-wider bg-primary/5 px-2.5 py-0.5 rounded" dir="ltr">
                  {result.volunteerId || "PENDING_ID"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              <div>
                <div className="text-muted-foreground text-xs mb-0.5">اسم الوحدة</div>
                <div className="font-bold text-foreground">{result.unitName || "مكتب طوارئ جبل أولياء"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-0.5">تاريخ تعبئة الاستمارة الرقمية</div>
                <div className="font-bold text-foreground">{formatDate(result.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* عرض وحفظ الكارنيه فقط في حال الاعتماد الناجح */}
          {isApproved && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="max-w-full overflow-x-auto pb-2">
                <div style={{ width: "580px" }} className="mx-auto shadow-xl rounded-2xl overflow-hidden border">
                  <IDCard volunteer={result} />
                </div>
              </div>
              <div className="text-center">
                <Button onClick={() => setShowCard(true)} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  تجهيز البطاقة الرقمية للحفظ والتنزيل
                </Button>
              </div>
              <CardScreenshotPopup volunteer={result} open={showCard} onClose={() => setShowCard(false)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
