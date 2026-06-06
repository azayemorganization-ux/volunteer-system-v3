import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IDCard, CardScreenshotPopup, type VolunteerCardData } from "./success";
import { checkVolunteerStatus } from "@/lib/api";

// واجهة بيانات الحالة المتكاملة لخدمة العرض والتعديل معاً
interface StatusData extends VolunteerCardData {
  status: string;
  rejectionReason?: string | null;
  approvedAt?: string;
  createdAt: string;
  whatsapp?: string;
  yearOfVolunteering: string;
  unitId: number;
  isTotTrainer: boolean;
  totYear?: string;
  totCertificateUrl?: string | null;
  otherCertificateUrl?: string | null;
  lastFirstAidRefresher?: string;
  otherPrograms?: string;
  currentStatusInKhartoum: string;
  expectedReturnTime?: string;
  availabilityLevel: string;
}

interface UnitType {
  id: number;
  name: string;
  sector: string;
}

const OTHER_PROGRAMS = ["لا", "التمريض المنزلي", "الرعاية الصحية"] as const;

// شروط التحقق لضمان سلامة البيانات المرفوعة عند التعديل
const formSchema = z.object({
  fullName: z.string().min(5, "يجب إدخال الاسم الرباعي كاملاً"),
  nationalId: z.string().min(5, "يجب إدخال الرقم الوطني"),
  phone: z.string().min(9, "يجب إدخال رقم الهاتف بشكل صحيح"),
  whatsapp: z.string().optional(),
  yearOfVolunteering: z.string().min(4, "يجب اختيار سنة التطوع"),
  unitId: z.coerce.number().min(1, "يجب اختيار الوحدة الإدارية"),
  photoUrl: z.string().optional().or(z.literal("")),
  isTotTrainer: z.enum(["true", "false"]),
  totYear: z.string().optional(),
  totCertificateUrl: z.string().nullable().optional().or(z.literal("")),
  otherCertificateUrl: z.string().nullable().optional().or(z.literal("")),
  lastFirstAidRefresher: z.string().optional(),
  otherPrograms: z.string().optional(),
  currentStatusInKhartoum: z.string().min(1, "يجب اختيار الوضع الحالي"),
  expectedReturnTime: z.string().optional(),
  availabilityLevel: z.string().min(1, "يجب اختيار مستوى التوافر"),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "يجب الموافقة على شروط دليل تنمية المتطوعين",
  }),
}).superRefine((data, ctx) => {
  if (data.otherPrograms && data.otherPrograms !== "لا" && !data.otherCertificateUrl) {
    ctx.addIssue({ 
      code: z.ZodIssueCode.custom, 
      message: "يجب رفع شهادة التخصص للبرنامج الإضافي", 
      path: ["otherCertificateUrl"] 
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

export default function StatusCheck() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // الحالات الأساسية للاستعلام (من النسخة القديمة المحبوبة)
  const [nationalId, setNationalId] = useState("");
  const [result, setResult] = useState<StatusData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);

  // حالات كواليس التعديل والرفع (الميزة الجديدة)
  const [isEditing, setIsEditing] = useState(false);
  const [dbUnits, setDbUnits] = useState<UnitType[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const CLOUDINARY_CLOUD_NAME = "ddznegswc";
  const CLOUDINARY_UPLOAD_PRESET = "kaee3l5k";
  const SERVER_URL = "https://volunteer-system-v3.onrender.com";

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingTot, setIsUploadingTot] = useState(false);
  const [isUploadingOther, setIsUploadingOther] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imagePanX, setImagePanX] = useState<number>(0);
  const [imagePanY, setImagePanY] = useState<number>(0);

  const [totCertPreview, setTotCertPreview] = useState<string | null>(null);
  const [otherCertPreview, setOtherCertPreview] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const totCertInputRef = useRef<HTMLInputElement>(null);
  const otherCertInputRef = useRef<HTMLInputElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "", nationalId: "", phone: "", whatsapp: "", yearOfVolunteering: "",
      unitId: 0, photoUrl: "", isTotTrainer: "false", totYear: "", totCertificateUrl: "",
      otherCertificateUrl: "", lastFirstAidRefresher: "", otherPrograms: "لا", 
      currentStatusInKhartoum: "", expectedReturnTime: "", availabilityLevel: "", agreedToTerms: false,
    },
  });

  const isTotTrainer = form.watch("isTotTrainer");
  const otherPrograms = form.watch("otherPrograms");
  const currentStatusInKhartoum = form.watch("currentStatusInKhartoum");
  const watchedValues = form.watch();

  // جلب الوحدات عند فتح فورم التعديل
  useEffect(() => {
    if (!isEditing) return;
    const fetchLiveUnits = async () => {
      setIsLoadingUnits(true);
      try {
        const response = await fetch(`${SERVER_URL}/api/units`);
        if (!response.ok) throw new Error("فشل جلب الوحدات");
        const data = await response.json();
        setDbUnits(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingUnits(false);
      }
    };
    fetchLiveUnits();
  }, [isEditing]);

  // دالة الاستعلام الأصلية الآمنة
  const handleCheck = async () => {
    if (!nationalId.trim()) { 
      setError("يرجى إدخال الرقم الوطني بشكل صحيح"); 
      return; 
    }
    setLoading(true);
    setError("");
    setResult(null);
    setIsEditing(false);
    try {
      const data = await checkVolunteerStatus(nationalId.trim());
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

  // تعبئة حقول الاستمارة ببيانات المتطوع الحالية لتعديلها
  const handleStartEditing = () => {
    if (!result) return;
    
    form.reset({
      fullName: result.fullName || "",
      nationalId: result.nationalId || "",
      phone: result.phone || "",
      whatsapp: result.whatsapp || "",
      yearOfVolunteering: result.yearOfVolunteering ? result.yearOfVolunteering.toString() : "",
      unitId: result.unitId || 0,
      photoUrl: result.photoUrl || "",
      isTotTrainer: result.isTotTrainer ? "true" : "false",
      totYear: result.totYear || "",
      totCertificateUrl: result.totCertificateUrl || "",
      otherCertificateUrl: result.otherCertificateUrl || "",
      lastFirstAidRefresher: result.lastFirstAidRefresher || "",
      otherPrograms: result.otherPrograms || "لا",
      currentStatusInKhartoum: result.currentStatusInKhartoum || "",
      expectedReturnTime: result.expectedReturnTime || "",
      availabilityLevel: result.availabilityLevel || "",
      agreedToTerms: true,
    });

    if (result.photoUrl) setPhotoPreview(result.photoUrl);
    if (result.totCertificateUrl) setTotCertPreview(result.totCertificateUrl);
    if (result.otherCertificateUrl) setOtherCertPreview(result.otherCertificateUrl);

    setIsEditing(true);
  };

  // منطق كلاودنري لإدارة المرفقات الجديدة
  const uploadToCloudinary = async (fileOrBase64: File | string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", fileOrBase64);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("فشل رفع الملف إلى السيرفر");
    const data = await response.json();
    return data.secure_url;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string);
      setImageZoom(1); setImagePanX(0); setImagePanY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyImageAdjustments = async () => {
    if (!imageElementRef.current || !rawImageSrc) return;
    setIsUploadingPhoto(true);
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 400, 400);
      ctx.save(); ctx.translate(200, 200); ctx.scale(imageZoom, imageZoom);
      const scaleFactor = 400 / 160;
      ctx.translate(imagePanX * scaleFactor, imagePanY * scaleFactor);
      const img = imageElementRef.current;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let dWidth = 400, dHeight = 400;
      if (imgRatio > 1) dWidth = 400 * imgRatio; else dHeight = 400 / imgRatio;
      ctx.drawImage(img, -dWidth / 2, -dHeight / 2, dWidth, dHeight); ctx.restore();
      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.88);
      setPhotoPreview(croppedBase64);
      try {
        const cloudinaryUrl = await uploadToCloudinary(croppedBase64);
        form.setValue("photoUrl", cloudinaryUrl, { shouldValidate: true });
        setRawImageSrc(null);
        toast({ title: "تم تحديث الصورة الشخصية بنجاح" });
      } catch {
        toast({ variant: "destructive", title: "خطأ في معالجة الصورة" });
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleTotCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingTot(true);
    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("totCertificateUrl", cloudinaryUrl, { shouldValidate: true });
      setTotCertPreview(cloudinaryUrl);
    } catch {
      toast({ variant: "destructive", title: "فشل رفع شهادة الـ TOT" });
    } finally {
      setIsUploadingTot(false);
    }
  };

  const handleOtherCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingOther(true);
    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("otherCertificateUrl", cloudinaryUrl, { shouldValidate: true });
      setOtherCertPreview(cloudinaryUrl);
    } catch {
      toast({ variant: "destructive", title: "فشل رفع شهادة التخصص" });
    } finally {
      setIsUploadingOther(false);
    }
  };

  // دالة الإرسال المحدثة والمؤمنة للباك إند
  const onEditSubmit = async (data: FormValues) => {
    if (!result) return;
    const currentId = result.id || (result as any)._id || (result as any).volunteerId;

    if (!currentId) {
      toast({ 
        variant: "destructive", 
        title: "خطأ في معرف الطلب", 
        description: "لم نتمكن من تحديد رقم المعرف التلقائي للطلب، يرجى تحديث الصفحة وإعادة المحاولة." 
      });
      return;
    }

    try {
      const cleanData: Record<string, any> = {
        ...data,
        unitId: Number(data.unitId),
        isTotTrainer: data.isTotTrainer === "true" ? true : false,
        isTotTrainerStr: data.isTotTrainer
      };

      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === "") {
          cleanData[key] = null;
        }
      });

      const response = await fetch(`${SERVER_URL}/api/volunteers/resubmit/${currentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.startsWith("<!")) {
          const match = errorText.match(/Error: (.*?)(<br>|<\/pre>)/);
          const cleanServerMsg = match ? match[1] : `خطأ داخلي في السيرفر (${response.status})`;
          throw new Error(cleanServerMsg);
        }
        try {
          const parsedError = JSON.parse(errorText);
          throw new Error(parsedError.error || parsedError.message || "حدث خطأ غير متوقع");
        } catch {
          throw new Error(errorText || "فشل معالجة الطلب في السيرفر");
        }
      }

      await response.json();
      toast({ title: "تم تحديث طلبك بنجاح", description: "تمت إعادة إرسال البيانات والمستندات بنجاح للمراجعة الفورية." });
      setIsEditing(false);
      await handleCheck(); // إعادة الفحص لمزامنة الشاشة والعودة للوضع المعلق الطبيعي
    } catch (err: any) {
      toast({ variant: "destructive", title: "فشل تحديث البيانات", description: err.message });
    }
  };

  const isApproved = result?.status === "approved";
  const isRejected = result?.status === "rejected";

  const formatDate = (dateString?: string) => {
    if (!dateString) return "غير محدد";
    try {
      return new Date(dateString).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateString; }
  };

  // تجميل شبكة الاتصالات الذكي في فورم التعديل
  const phoneVal = watchedValues.phone || "";
  let operatorBadge = null;
  if (phoneVal.startsWith("091") || phoneVal.startsWith("096")) operatorBadge = <span className="text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded">Zain زين</span>;
  else if (phoneVal.startsWith("092") || phoneVal.startsWith("099")) operatorBadge = <span className="text-[10px] font-bold bg-yellow-400 text-slate-900 px-2 py-0.5 rounded">MTN ام تي ان</span>;
  else if (phoneVal.startsWith("011") || phoneVal.startsWith("012")) operatorBadge = <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded">Sudani سوداني</span>;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-lg mb-8">
        {/* زر العودة للمنصة الرئيسية (من النسخة القديمة تماماً) */}
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

        {/* كارت الاستعلام الأصلي الأنيق */}
        {!isEditing && (
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
        )}
      </div>

      {/* عرض نتائج الاستعلام الأصلية + زر التعديل المدمج بذكاء */}
      {result && !isEditing && (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* حاوية الحالة والأيقونات الرسمية القديمة */}
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
                ? "تم رفض طلب الحصر الحالي لوجود نواقص في البيانات. يرجى مراجعة سبب الرفض الموضح أدناه وتعديله."
                : "طلبك قيد المراجعة والتدقيق الآن من قبل مكتب طوارئ جبل أولياء. يتم تحديث واعتماد الطلبات دورياً خلال 24 ساعة."}
            </p>
          </div>

          {/* صندوق الرفض مدمج معه زر فتح التعديل بشكل احترافي ومتناسق مع الأيقونات القديمة */}
          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm space-y-4 animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <div className="flex-1">
                  <p className="font-bold text-red-900 mb-1">توجيهات مكتب الطوارئ بخصوص الرفض:</p>
                  <p className="text-red-700 text-sm leading-relaxed bg-white/80 p-3 rounded-lg border border-red-100 shadow-inner">
                    {result.rejectionReason || "لم يتم تحديد سبب مخصص، يرجى مراجعة وتحديث حقول استمارتك."}
                  </p>
                </div>
              </div>
              <Button onClick={handleStartEditing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                فتح تعديل البيانات وإعادة الإرسال
              </Button>
            </div>
          )}

          {/* بطاقة تفاصيل المتطوع الأساسية بالتصميم والجريد القديم 100% */}
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
            
            {/* العودة للجريد الأصلي لعرض البيانات الأساسية للمستخدم */}
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

          {/* عرض وحفظ الكارنيه بنسخته القديمة والجميلة */}
          {isApproved && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="max-w-full overflow-x-auto pb-2">
                <div style={{ width: "580px" }} className="mx-auto shadow-xl rounded-2xl overflow-hidden border">
                  <IDCard volunteer={result} />
                </div>
              </div>
              <div className="text-center">
                <Button onClick={() => setShowCard(true)} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/xl" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  تجهيز البطاقة الرقمية للحفظ والتنزيل
                </Button>
              </div>
              <CardScreenshotPopup volunteer={result} open={showCard} onClose={() => setShowCard(false)} />
            </div>
          )}
        </div>
      )}

      {/* نموذج التعديل (يفتح في حاوية متناسقة مع كروت الصفحة القديمة) */}
      {isEditing && result && (
        <div className="w-full max-w-2xl bg-white border rounded-xl shadow-sm p-6 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">تعديل وتصحيح بيانات المتطوع</h3>
              <p className="text-xs text-muted-foreground mt-0.5">قم بتعديل الحقول المرفوضة واضغط على إعادة إرسال الطلب</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs border h-8 px-3 rounded-lg text-slate-500">إلغاء الأمر</Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6">
              
              {/* 1. البيانات الأساسية */}
              <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1">📋 حقول البيانات الأساسية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-semibold text-slate-700">الاسم الرباعي كاملاً *</FormLabel>
                      <FormControl><Input className="bg-white rounded-lg" {...field} /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-semibold text-slate-700">الرقم الوطني *</FormLabel>
                      <FormControl><Input className="bg-white rounded-lg" dir="ltr" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1"><FormLabel className="text-xs font-semibold text-slate-700">رقم الهاتف النشط *</FormLabel>{operatorBadge}</div>
                      <FormControl><Input className="bg-white rounded-lg" dir="ltr" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">رقم الواتساب (اختياري)</FormLabel>
                      <FormControl><Input className="bg-white rounded-lg" dir="ltr" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="yearOfVolunteering" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2"><FormLabel className="text-xs font-semibold text-slate-700">سنة بدء العمل التطوعي الفعلي بالجمعية *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder="اختر سنة الالتحاق" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-[200px]">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select><FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* 2. الصورة الشخصية والمحاذاة */}
              <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1">📸 الصورة الشخصية الرسمية بالبطاقة</h4>
                <FormField control={form.control} name="photoUrl" render={({ field: { value: _v, ...field } }) => (
                  <FormItem>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border border-dashed bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="text-[11px] text-muted-foreground">بلا صورة</span>}
                      </div>
                      <div className="space-y-2">
                        <FormControl><input {...field} ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} value="" /></FormControl>
                        <Button type="button" variant="outline" size="sm" className="bg-white rounded-lg text-xs" onClick={() => photoInputRef.current?.click()}>🔄 استبدال / رفع صورة شخصية</Button>
                      </div>
                    </div>
                    {rawImageSrc && (
                      <div className="border border-dashed bg-white p-3 rounded-xl mt-3 space-y-3">
                        <p className="text-xs font-bold text-red-600">⚙️ ستوديو محاذاة أبعاد وجهك بالمركز</p>
                        <div className="flex flex-col items-center gap-4 md:flex-row justify-center">
                          <div className="w-24 h-24 rounded-full border-2 border-emerald-500 overflow-hidden relative bg-slate-100 shrink-0">
                            <img ref={imageElementRef} src={rawImageSrc} className="w-full h-full object-cover" style={{ transform: `scale(${imageZoom}) translate(${imagePanX}px, ${imagePanY}px)`, transition: "none" }} />
                          </div>
                          <div className="w-full flex-1 space-y-2 text-xs">
                            <input type="range" min="1" max="4" step="0.1" value={imageZoom} onChange={(e) => setImageZoom(parseFloat(e.target.value))} className="w-full" />
                            <input type="range" min="-80" max="80" step="1" value={imagePanX} onChange={(e) => setImagePanX(parseInt(e.target.value))} className="w-full" />
                            <input type="range" min="-80" max="80" step="1" value={imagePanY} onChange={(e) => setImagePanY(parseInt(e.target.value))} className="w-full" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2"><Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg" onClick={handleApplyImageAdjustments} disabled={isUploadingPhoto}>{isUploadingPhoto ? "جاري الحفظ..." : "✅ اعتماد وزن الصورة"}</Button></div>
                      </div>
                    )}
                  </FormItem>
                )} />
              </div>

              {/* 3. الوحدة الإدارية */}
              <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1">📍 التبعية والوحدة الإدارية</h4>
                <FormField control={form.control} name="unitId" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-semibold text-slate-700">الوحدة الحالية بمحلية جبل أولياء *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}><FormControl>
                        <SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder={isLoadingUnits ? "⏳ جاري جلب الوحدات المتوفرة..." : "اضغط لاختيار الوحدة المحدثة"} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dbUnits.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.name} {u.sector ? `(${u.sector})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>

              {/* 4. السجل التدريبي */}
              <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1">🎓 تحديث السجل التدريبي</h4>
                <FormField control={form.control} name="isTotTrainer" render={({ field }) => (
                  <FormItem className="space-y-2"><FormLabel className="text-xs font-semibold text-slate-700">هل أنت مدرب إسعافات أولية معتمد بالجمعية؟ *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 bg-white p-3 rounded-lg border">
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="true" id="edit-tot-yes" /><label htmlFor="edit-tot-yes" className="text-xs font-bold cursor-pointer">نعم، مدرب معتمد</label></div>
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="false" id="edit-tot-no" /><label htmlFor="edit-tot-no" className="text-xs font-bold cursor-pointer">لا، لست مدرباً</label></div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />

                {isTotTrainer === "true" && (
                  <div className="p-4 bg-white border rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <FormField control={form.control} name="totCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                      <FormItem className="border border-dashed p-3 rounded-lg text-center">
                        <FormLabel className="text-xs font-semibold text-slate-700 block mb-2">تحديث شهادة الـ TOT (صورة أو PDF)</FormLabel>
                        <input type="file" ref={totCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleTotCertUpload} />
                        <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => totCertInputRef.current?.click()} disabled={isUploadingTot}>📁 رفع ملف الشهادة</Button>
                        {totCertPreview && <p className="text-[10px] text-green-700 font-bold mt-1">✅ الشهادة محفوظة وجاهزة للرفع</p>}
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="totYear" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-slate-700">سنة نيل الشهادة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder="السنة" /></SelectTrigger></FormControl><SelectContent className="max-h-[150px]">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastFirstAidRefresher" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-slate-700">آخر دورة تنشيطية</FormLabel>
                          <FormControl><Input type="date" className="bg-white rounded-lg" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="otherPrograms" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-semibold text-slate-800">هل أنت مدرب في برامج أخرى؟</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder="اختر البرنامج" /></SelectTrigger></FormControl><SelectContent>{OTHER_PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                      </FormItem>
                    )} />
                    {otherPrograms && otherPrograms !== "لا" && (
                      <FormField control={form.control} name="otherCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                        <FormItem className="border border-dashed border-red-200 p-3 rounded-lg bg-white">
                          <FormLabel className="text-xs font-semibold text-red-600 block mb-1">يجب رفع شهادة تخصص البرنامج الإضافي *</FormLabel>
                          <input type="file" ref={otherCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleOtherCertUpload} />
                          <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => otherCertInputRef.current?.click()} disabled={isUploadingOther}>📁 رفع ملف التخصص</Button>
                          {otherCertPreview && <p className="text-[10px] text-green-700 font-bold mt-1">✅ شهادة التخصص جاهزة</p>}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )} />
                    )}
                  </div>
                )}
              </div>

              {/* 5. الجاهزية والوضعية الجغرافية */}
              <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1">🏃‍♂️ الوضعية الجغرافية الحالية والجاهزية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="currentStatusInKhartoum" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-semibold text-slate-700">موقع تواجدك الحالي بدقة *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder="اختر موقعك" /></SelectTrigger></FormControl><SelectContent><SelectItem value="موجود حالياً">موجود حالياً داخل الولاية</SelectItem><SelectItem value="في الولايات - خارج ولاية الخرطوم">في الولايات - خارج ولاية الخرطوم</SelectItem><SelectItem value="مسافر خارج البلاد">خارج السودان تماماً</SelectItem></SelectContent></Select><FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  {currentStatusInKhartoum && currentStatusInKhartoum !== "موجود حالياً" && (
                    <FormField control={form.control} name="expectedReturnTime" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-semibold text-slate-700">متى ستعود لولاية الخرطوم التقريبية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder="حدد المدة" /></SelectTrigger></FormControl><SelectContent>{["بعد شهر","بعد شهرين","بعد 3 أشهر","بعد 4 أشهر","بعد 5 أشهر","بعد 6 أشهر","بعد سنة","غير محدد"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                      </FormItem>
                    )} />
                  )}
                  <FormField control={form.control} name="availabilityLevel" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2"><FormLabel className="text-xs font-semibold text-slate-700">مستوى تفرغك الحالي لأنشطة الجمعية *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-lg"><SelectValue placeholder="اختر مستوى التوافر" /></SelectTrigger></FormControl><SelectContent><SelectItem value="متاح بالكامل">متاح بالكامل</SelectItem><SelectItem value="متاح جزئياً">متاح جزئياً</SelectItem><SelectItem value="غير متاح حالياً">غير متاح في الوقت الراهن</SelectItem></SelectContent></Select><FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* أزرار الحفظ والإرسال للتعديل */}
              <div className="pt-2 flex flex-col gap-2">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-base h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
                  disabled={form.formState.isSubmitting || isUploadingPhoto || isUploadingTot || isUploadingOther}
                >
                  {form.formState.isSubmitting ? "⚡ جاري تحديث وحفظ البيانات..." : "💾 تحديث وإعادة إرسال الاستمارة للمطابقة"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-slate-500 font-semibold" onClick={() => setIsEditing(false)}>إلغاء الأمر والرجوع للوراء</Button>
              </div>

            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
