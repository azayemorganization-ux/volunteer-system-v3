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

// واجهة بيانات الحالة القادمة من السيرفر
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

// نفس الـ Schema الخاص بالاستمارة الرئيسية لضمان تطابق البيانات والتحقق
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
  
  // حالات الاستعلام الأساسية
  const [nationalId, setNationalId] = useState("");
  const [result, setResult] = useState<StatusData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);

  // حالات وضع تعديل البيانات للمرفوضين
  const [isEditing, setIsEditing] = useState(false);
  const [dbUnits, setDbUnits] = useState<UnitType[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  // إعدادات كلاودنري المعتمدة في مشروعك
  const CLOUDINARY_CLOUD_NAME = "ddznegswc";
  const CLOUDINARY_UPLOAD_PRESET = "kaee3l5k";
  const SERVER_URL = "https://volunteer-system-v3.onrender.com";

  // حالات رفع ومعاينة الصور والملفات
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

  // إعداد حقول الاستمارة
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

  // جلب الوحدات عند تفعيل وضع التعديل
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

  // دالة الاستعلام الفوري عن الحالة
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

  // تشغيل وضع التعديل وملء الاستمارة بالبيانات الحالية للطلب المرفوض
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
      agreedToTerms: true, // موافق مسبقاً طالما قام بالتقديم
    });

    if (result.photoUrl) setPhotoPreview(result.photoUrl);
    if (result.totCertificateUrl) setTotCertPreview(result.totCertificateUrl);
    if (result.otherCertificateUrl) setOtherCertPreview(result.otherCertificateUrl);

    setIsEditing(true);
  };

  // منطق رفع الملفات لكلاودنري
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
      setImageZoom(1);
      setImagePanX(0);
      setImagePanY(0);
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
      } catch (error) {
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

  // إرسال البيانات المحدثة (PUT) وإعادة فحص الحالة تلقائياً - نسخة مؤمنة ومطورة بالكامل للجوال
  const onEditSubmit = async (data: FormValues) => {
    if (!result) return;
    
    // محاولة جلب الـ id من أي مسمى محتمل من الـ Backend لضمان عدم إرسال مسار ناقص
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
      // تجهيز وتنظيف الكائن لإرضاء Schema قاعدة البيانات والـ Constraints في الباك إند
      const cleanData: Record<string, any> = {
        ...data,
        unitId: Number(data.unitId),
        // إرسال الحقل بالشكلين (Boolean و String) لتأمين الاستقبال أياً كانت طريقة بنائه في الباك إند
        isTotTrainer: data.isTotTrainer === "true" ? true : false,
        isTotTrainerStr: data.isTotTrainer
      };

      // تحويل أي نص فارغ "" إلى null لحماية السيرفر من أخطاء الـ Validation والـ Foreign Keys
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === "") {
          cleanData[key] = null;
        }
      });

      const response = await fetch(`${SERVER_URL}/api/volunteers/${currentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanData),
      });

      // لو السيرفر ما رجع كود نجاح (مثلاً رجع 500 ورجع معاه صفحة HTML الافتراضية)
      if (!response.ok) {
        const errorText = await response.text();
        
        // فحص ما إذا كانت الاستجابة صفحة مكسورة، لنستخرج نص الخطأ الصافي ونعرضه في الـ Toast
        if (errorText.startsWith("<!")) {
          const match = errorText.match(/Error: (.*?)(<br>|<\/pre>)/);
          const cleanServerMsg = match ? match[1] : `خطأ داخلي في السيرفر (Status Code: ${response.status})`;
          throw new Error(cleanServerMsg);
        }
        
        // لو النص خطأ عادي نقرأه مباشرة
        try {
          const parsedError = JSON.parse(errorText);
          throw new Error(parsedError.error || parsedError.message || "حدث خطأ غير متوقع في السيرفر");
        } catch {
          throw new Error(errorText || "فشل معالجة الطلب في السيرفر");
        }
      }

      // إذا نجحت العملية نقرأ الـ JSON بسلام
      await response.json();
      
      toast({ 
        title: "تم تحديث طلبك بنجاح", 
        description: "تمت إعادة إرسال البيانات والمستندات بنجاح للمراجعة الفورية من قبل مكتب الطوارئ." 
      });
      
      setIsEditing(false);
      // إعادة فحص الحالة تلقائياً لمزامنة الشاشة مع الوضع الجديد (معلق / قيد المراجعة)
      await handleCheck();

    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "فشل تحديث البيانات", 
        description: err.message || "عذراً، تعذر الاتصال بالسيرفر حالياً. يرجى التحقق من الشبكة." 
      });
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

  // تمييز شبكة الاتصال
  const phoneVal = watchedValues.phone || "";
  let operatorBadge = null;
  if (phoneVal.startsWith("091") || phoneVal.startsWith("096")) operatorBadge = <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-1 rounded-md">Zain زين</span>;
  else if (phoneVal.startsWith("092") || phoneVal.startsWith("099")) operatorBadge = <span className="text-[10px] font-black bg-yellow-400 text-slate-900 px-2 py-1 rounded-md">MTN ام تي ان</span>;
  else if (phoneVal.startsWith("011") || phoneVal.startsWith("012")) operatorBadge = <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-md">Sudani سوداني</span>;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 flex flex-col items-center" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="w-full max-w-lg mb-8">
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

        {/* لوحة البحث */}
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
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 border border-destructive/20">{error}</div>}
            <Button onClick={handleCheck} disabled={loading || !nationalId.trim()} className="w-full h-12 text-base font-bold">
              {loading ? "جاري البحث ..." : "استعلام عن الطلب "}
            </Button>
          </div>
        )}
      </div>

      {/* لوحة النتائج */}
      {result && !isEditing && (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in duration-300">
          <div className={`rounded-xl border p-5 text-center shadow-sm ${isApproved ? "bg-green-50/70 border-green-200" : isRejected ? "bg-red-50/70 border-red-200" : "bg-amber-50/70 border-amber-200"}`}>
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-lg font-black mb-2 ${isApproved ? "bg-green-100 text-green-800" : isRejected ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
              {isApproved ? "تهانينا .. تم اعتمادك رسمياً" : isRejected ? "لم يتم الاعتماد (مرفوض)" : "الطلب قيد المراجعة والمطابقة"}
            </div>
            <p className="text-sm font-medium mt-1 leading-relaxed">
              {isApproved ? `تم اعتماد وتوثيق طلبك برقم متطوع رسمي في تاريخ ${formatDate(result.approvedAt)}. بطاقتك الرقمية جاهزة للعرض الآن.` : isRejected ? "تم رفض طلب الحصر الحالي لوجود نواقص في البيانات. يرجى مراجعة سبب الرفض أدناه ثم تحديث بياناتك." : "طلبك قيد المراجعة والتدقيق الآن من قبل مكتب طوارئ جبل أولياء."}
            </p>
          </div>

          {/* لوحة توجيه الرفض وإتاحة زر التعديل المباشر */}
          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="font-bold text-red-900 flex-1">
                  <p className="mb-1">⚠️ توجيهات مكتب الطوارئ بخصوص الرفض:</p>
                  <p className="text-red-700 text-sm font-medium bg-white p-3 rounded-lg border border-red-150 shadow-inner">{result.rejectionReason || "لم يتم تحديد سبب مخصص، يرجى مراجعة وتحديث حقول استمارتك."}</p>
                </div>
              </div>
              <Button onClick={handleStartEditing} className="w-full bg-[#C1272D] hover:bg-[#8B1519] text-white font-black h-12 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                📝 فتح تعديل البيانات وإعادة الإرسال
              </Button>
            </div>
          )}

          {/* عرض كارت المعاينة السريع */}
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              {result.photoUrl ? (
                <img src={result.photoUrl} alt="صورة المتطوع" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shadow" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border text-muted-foreground">👤</div>
              )}
              <div>
                <div className="font-black text-lg text-foreground">{result.fullName}</div>
                <div className="text-primary font-mono text-xs font-bold bg-primary/5 px-2.5 py-0.5 rounded tracking-wider">{result.volunteerId || "PENDING_ID"}</div>
              </div>
            </div>
          </div>

          {isApproved && (
            <div className="space-y-4 text-center">
              <div style={{ width: "580px" }} className="mx-auto shadow-xl rounded-2xl overflow-hidden border">
                <IDCard volunteer={result} />
              </div>
              <Button onClick={() => setShowCard(true)} className="gap-2 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">تجهيز البطاقة الرقمية للحفظ والتنزيل</Button>
              <CardScreenshotPopup volunteer={result} open={showCard} onClose={() => setShowCard(false)} />
            </div>
          )}
        </div>
      )}

      {/* نموذج التعديل المتكامل */}
      {isEditing && result && (
        <div className="w-full max-w-2xl bg-white border rounded-2xl shadow-xl p-6 md:p-8 space-y-6 mt-4 animate-in zoom-in-95 duration-300">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">تعديل وتصحيح بيانات المتطوع</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">قم بتعديل الحقول المرفوضة واضغط على إعادة إرسال الطلب</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs font-bold border rounded-lg px-2 text-slate-500">إلغاء الأمر</Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6">
              
              {/* 1. البيانات الأساسية */}
              <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-sm font-black text-slate-800 border-b pb-2">📋 حقول البيانات الأساسية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold text-slate-700">الاسم الرباعي كاملاً *</FormLabel>
                      <FormControl><Input className="bg-white rounded-xl" {...field} /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold text-slate-700">الرقم الوطني *</FormLabel>
                      <FormControl><Input className="bg-white rounded-xl" dir="ltr" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1"><FormLabel className="text-xs font-bold text-slate-700">رقم الهاتف النشط *</FormLabel>{operatorBadge}</div>
                      <FormControl><Input className="bg-white rounded-xl" dir="ltr" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold text-slate-600">رقم الواتساب (اختياري)</FormLabel>
                      <FormControl><Input className="bg-white rounded-xl" dir="ltr" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="yearOfVolunteering" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2"><FormLabel className="text-xs font-bold text-slate-700">سنة بدء العمل التطوعي الفعلي بالجمعية *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder="اختر سنة الالتحاق" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-[200px]">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select><FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* 2. الصورة الشخصية والمحاذاة */}
              <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-sm font-black text-slate-800 border-b pb-2">📸 الصورة الشخصية الرسمية بالبطاقة</h4>
                <FormField control={form.control} name="photoUrl" render={({ field: { value: _v, ...field } }) => (
                  <FormItem>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl border border-dashed bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400">بلا صورة</span>}
                      </div>
                      <div className="space-y-2">
                        <FormControl><input {...field} ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} value="" /></FormControl>
                        <Button type="button" variant="outline" size="sm" className="bg-white rounded-xl" onClick={() => photoInputRef.current?.click()}>🔄 استبدال / رفع صورة شخصية</Button>
                      </div>
                    </div>
                    {rawImageSrc && (
                      <div className="border border-dashed bg-white p-3 rounded-xl mt-3 space-y-3">
                        <p className="text-xs font-black text-slate-800 text-[#C1272D]">⚙️ ستوديو محاذاة أبعاد وجهك بالمركز</p>
                        <div className="flex flex-col items-center gap-4 md:flex-row justify-center">
                          <div className="w-28 h-28 rounded-full border-[3px] border-emerald-500 overflow-hidden relative bg-slate-100 shrink-0">
                            <img ref={imageElementRef} src={rawImageSrc} className="w-full h-full object-cover" style={{ transform: `scale(${imageZoom}) translate(${imagePanX}px, ${imagePanY}px)`, transition: "none" }} />
                          </div>
                          <div className="w-full flex-1 space-y-2 text-xs">
                            <input type="range" min="1" max="4" step="0.1" value={imageZoom} onChange={(e) => setImageZoom(parseFloat(e.target.value))} className="w-full" />
                            <input type="range" min="-80" max="80" step="1" value={imagePanX} onChange={(e) => setImagePanX(parseInt(e.target.value))} className="w-full" />
                            <input type="range" min="-80" max="80" step="1" value={imagePanY} onChange={(e) => setImagePanY(parseInt(e.target.value))} className="w-full" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2"><Button type="button" size="sm" className="bg-emerald-600 text-white text-xs font-black rounded-lg" onClick={handleApplyImageAdjustments} disabled={isUploadingPhoto}>{isUploadingPhoto ? "جاري الحفظ..." : "✅ اعتماد وزن الصورة"}</Button></div>
                      </div>
                    )}
                  </FormItem>
                )} />
              </div>

              {/* 3. الوحدة الإدارية */}
              <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-sm font-black text-slate-800 border-b pb-2">📍 التبعية والوحدة الإدارية</h4>
                <FormField control={form.control} name="unitId" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-slate-700">الوحدة الحالية بمحلية جبل أولياء *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}><FormControl>
                        <SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder={isLoadingUnits ? "⏳ جاري جلب الوحدات المتوفرة..." : "اضغط لاختيار الوحدة المحدثة"} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dbUnits.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.name} {u.sector ? `(${u.sector})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>

              {/* 4. السجل التدريبي */}
              <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-sm font-black text-slate-800 border-b pb-2">🎓 تحديث السجل التدريبي</h4>
                <FormField control={form.control} name="isTotTrainer" render={({ field }) => (
                  <FormItem className="space-y-2"><FormLabel className="text-xs font-bold text-slate-700">هل أنت مدرب إسعافات أولية معتمد بالجمعية؟ *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 bg-white p-3 rounded-xl border">
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="true" id="edit-tot-yes" /><label htmlFor="edit-tot-yes" className="text-xs font-bold cursor-pointer">نعم، مدرب معتمد</label></div>
                        <div className="flex items-center gap-1.5"><RadioGroupItem value="false" id="edit-tot-no" /><label htmlFor="edit-tot-no" className="text-xs font-bold cursor-pointer">لا، لست مدرباً</label></div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />

                {isTotTrainer === "true" && (
                  <div className="p-4 bg-white border rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <FormField control={form.control} name="totCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                      <FormItem className="border-2 border-dashed p-3 rounded-lg text-center">
                        <FormLabel className="text-xs font-bold text-slate-700 block mb-2">تحديث شهادة الـ TOT (صورة أو PDF)</FormLabel>
                        <input type="file" ref={totCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleTotCertUpload} />
                        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => totCertInputRef.current?.click()} disabled={isUploadingTot}>📁 رفع ملف الشهادة</Button>
                        {totCertPreview && <p className="text-[11px] text-green-700 font-bold mt-1">✅ الشهادة محفوظة وجاهزة للرفع</p>}
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="totYear" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-bold text-slate-700">سنة نيل شهادة الـ TOT</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder="السنة" /></SelectTrigger></FormControl><SelectContent className="max-h-[150px]">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastFirstAidRefresher" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-bold text-slate-700">تاريخ آخر دورة تنشيطية</FormLabel>
                          <FormControl><Input type="date" className="bg-white rounded-xl" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="otherPrograms" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-bold text-slate-800">هل أنت مدرب في برامج أخرى بالجمعية؟</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder="اختر البرنامج" /></SelectTrigger></FormControl><SelectContent>{OTHER_PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                      </FormItem>
                    )} />
                    {otherPrograms && otherPrograms !== "لا" && (
                      <FormField control={form.control} name="otherCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                        <FormItem className="border border-dashed border-[#C1272D]/40 p-3 rounded-xl bg-white">
                          <FormLabel className="text-xs font-bold text-[#C1272D] block mb-1">يجب رفع شهادة تخصص البرنامج الإضافي *</FormLabel>
                          <input type="file" ref={otherCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleOtherCertUpload} />
                          <Button type="button" variant="outline" size="sm" onClick={() => otherCertInputRef.current?.click()} disabled={isUploadingOther}>📁 رفع ملف التخصص</Button>
                          {otherCertPreview && <p className="text-[11px] text-green-700 font-bold mt-1">✅ شهادة التخصص جاهزة</p>}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )} />
                    )}
                  </div>
                )}
              </div>

              {/* 5. الجاهزية والوضعية الجغرافية */}
              <div className="space-y-4 border p-4 rounded-xl bg-slate-50/50">
                <h4 className="text-sm font-black text-slate-800 border-b pb-2">🏃‍♂️ الوضعية الجغرافية الحالية والجاهزية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="currentStatusInKhartoum" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold text-slate-700">موقع تواجدك الحالي بدقة *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder="اختر موقعك" /></SelectTrigger></FormControl><SelectContent><SelectItem value="موجود حالياً">موجود حالياً داخل الولاية</SelectItem><SelectItem value="في الولايات - خارج ولاية الخرطوم">في الولايات - خارج ولاية الخرطوم</SelectItem><SelectItem value="مسافر خارج البلاد">خارج السودان تماماً</SelectItem></SelectContent></Select><FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  {currentStatusInKhartoum && currentStatusInKhartoum !== "موجود حالياً" && (
                    <FormField control={form.control} name="expectedReturnTime" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-bold text-slate-700">متى ستعود لولاية الخرطوم التقريبية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder="حدد المدة" /></SelectTrigger></FormControl><SelectContent>{["بعد شهر","بعد شهرين","بعد 3 أشهر","بعد 4 أشهر","بعد 5 أشهر","بعد 6 أشهر","بعد سنة","غير محدد"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                      </FormItem>
                    )} />
                  )}
                  <FormField control={form.control} name="availabilityLevel" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2"><FormLabel className="text-xs font-bold text-slate-700">مستوى تفرغك الحالي لأنشطة الجمعية *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white rounded-xl"><SelectValue placeholder="اختر مستوى التوافر" /></SelectTrigger></FormControl><SelectContent><SelectItem value="متاح بالكامل">متاح بالكامل</SelectItem><SelectItem value="متاح جزئياً">متاح جزئياً</SelectItem><SelectItem value="غير متاح حالياً">غير متاح في الوقت الراهن</SelectItem></SelectContent></Select><FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* زر إرسال التحديث والمصادقة */}
              <div className="pt-2 flex flex-col gap-2">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-base h-12 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-xl shadow-md"
                  disabled={form.formState.isSubmitting || isUploadingPhoto || isUploadingTot || isUploadingOther}
                >
                  {form.formState.isSubmitting ? "⚡ جاري حفظ وتحديث البيانات بالسيستم..." : "💾 تحديث وإعادة إرسال الاستمارة للمطابقة"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-slate-500 font-bold" onClick={() => setIsEditing(false)}>إلغاء الأمر والرجوع</Button>
              </div>

            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
