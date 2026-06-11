import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";

interface UnitType {
  id: number;
  name: string;
  sector: string;
}

const OTHER_PROGRAMS = ["لا", "التمريض المنزلي", "الرعاية الصحية"] as const;

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

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        await fetch('https://volunteer-system-v3.onrender.com');
      } catch (error) {
        console.log('Silent ping sent to server.');
      }
    };
    wakeUpServer();
  }, []);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });
  const [dbUnits, setDbUnits] = useState<UnitType[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  // إعدادات كلاودنري ثابتة لا تتغير
  const CLOUDINARY_CLOUD_NAME = "ddznegswc";
  const CLOUDINARY_UPLOAD_PRESET = "kaee3l5k";

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

  const SERVER_URL = "https://volunteer-system-v3.onrender.com";

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("srcs_welcome_dismissed");
    }
    return true;
  });

  const handleDismissWelcome = () => {
    localStorage.setItem("srcs_welcome_dismissed", "true");
    setShowWelcome(false);
  };

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

  useEffect(() => {
    const fetchLiveUnits = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/units`);
        if (!response.ok) throw new Error("فشل جلب الوحدات");
        const data = await response.json();
        setDbUnits(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingUnits(false);
      }
    };
    fetchLiveUnits();
  }, []);

  // ضبط التايمر الديناميكي
  useEffect(() => {
    const targetDate = new Date("2026-06-11T23:59:59").getTime();
    const tick = () => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance < 0) { 
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }); 
        return; 
      }
      setTimeLeft({ 
        days: Math.floor(distance / 86400000), 
        hours: Math.floor((distance % 86400000) / 3600000), 
        minutes: Math.floor((distance % 3600000) / 60000), 
        seconds: Math.floor((distance % 60000) / 1000), 
        ended: false 
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // حساب نسبة اكتمال الحقول
  const watchedValues = form.watch();
  const requiredFields = ["fullName", "nationalId", "phone", "yearOfVolunteering", "unitId", "currentStatusInKhartoum", "availabilityLevel", "agreedToTerms"];
  const filledRequiredCount = requiredFields.filter(field => {
    const val = watchedValues[field as keyof FormValues];
    if (typeof val === "boolean") return val === true;
    if (typeof val === "number") return val > 0;
    return !!val;
  }).length;
  const progressPercent = Math.round((filledRequiredCount / requiredFields.length) * 100);

  // بادئة شبكات الاتصال
  const phoneVal = watchedValues.phone || "";
  let operatorBadge = null;
  if (phoneVal.startsWith("091") || phoneVal.startsWith("096")) {
    operatorBadge = <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-1 rounded-md tracking-wide shadow-sm animate-in fade-in duration-200">Zain زين</span>;
  } else if (phoneVal.startsWith("092") || phoneVal.startsWith("099")) {
    operatorBadge = <span className="text-[10px] font-black bg-yellow-400 text-slate-900 px-2 py-1 rounded-md tracking-wide shadow-sm animate-in fade-in duration-200">MTN ام تي ان</span>;
  } else if (phoneVal.startsWith("011") || phoneVal.startsWith("012")) {
    operatorBadge = <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-md tracking-wide shadow-sm animate-in fade-in duration-200">Sudani سوداني</span>;
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "الملف كبير جداً", description: "يجب أن يكون حجم الصورة أقل من 5 ميغابايت" });
      return;
    }
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
      const viewPortSize = 160; const scaleFactor = 400 / viewPortSize;
      ctx.translate(imagePanX * scaleFactor, imagePanY * scaleFactor);
      const img = imageElementRef.current; const imgRatio = img.naturalWidth / img.naturalHeight;
      let dWidth = 400; let dHeight = 400;
      if (imgRatio > 1) { dWidth = 400 * imgRatio; } else { dHeight = 400 / imgRatio; }
      ctx.drawImage(img, -dWidth / 2, -dHeight / 2, dWidth, dHeight); ctx.restore();
      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.88); setPhotoPreview(croppedBase64);
      try {
        const cloudinaryUrl = await uploadToCloudinary(croppedBase64);
        form.setValue("photoUrl", cloudinaryUrl, { shouldValidate: true });
        setRawImageSrc(null);
        toast({ title: "تم ضبط ومحاذاة الصورة", description: "تم حفظ الصورة بالشكل المتناسق." });
      } catch (error) {
        toast({ variant: "destructive", title: "خطأ في النظام", description: "فشل حفظ الصورة المعدلة، يرجى المحاولة مجدداً." });
        setPhotoPreview(null);
      } finaly { setIsUploadingPhoto(false); }
    }
  };

  const handleTotCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingTot(true); const reader = new FileReader();
    reader.onloadend = () => setTotCertPreview(reader.result as string); reader.readAsDataURL(file);
    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("totCertificateUrl", cloudinaryUrl, { shouldValidate: true });
    } catch (error) { toast({ variant: "destructive", title: "خطأ", description: "لم يتم حفظ الملف." }); setTotCertPreview(null); }
    finally { setIsUploadingTot(false); }
  };

  const handleOtherCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingOther(true); const reader = new FileReader();
    reader.onloadend = () => setOtherCertPreview(reader.result as string); reader.readAsDataURL(file);
    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("otherCertificateUrl", cloudinaryUrl, { shouldValidate: true });
    } catch (error) { toast({ variant: "destructive", title: "خطأ", description: "لم يتم حفظ الملف." }); setOtherCertPreview(null); }
    finally { setIsUploadingOther(false); }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/volunteers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isTotTrainer: data.isTotTrainer === "true" }),
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("volunteerData", JSON.stringify(result));
        toast({ title: "تم التسجيل بنجاح", description: "شكراً لك على تسجيل بياناتك!" });
        setLocation("/success");
      } else { throw new Error(result.error || "حدث خطأ في التسجيل"); }
    } catch (err: any) { toast({ variant: "destructive", title: "خطأ في التسجيل", description: err.message }); }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 antialiased" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* الترحيب السحري المحسن */}
      {showWelcome && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-white rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200/60 transform animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-[#A31D22] via-[#C1272D] to-[#8B1519] p-8 text-center text-white border-b-[6px] border-amber-500 relative">
              <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md border-2 border-white/20 shadow-lg">
                 <span className="text-4xl">🇸🇩</span>
              </div>
              <h2 className="text-2xl font-black mb-1">فخر جبل أولياء</h2>
              <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase opacity-90">Digital Pioneer in Sudan</p>
            </div>
            <div className="p-8 text-center space-y-5 bg-gradient-to-b from-white to-slate-50">
              <p className="text-slate-800 text-lg font-bold leading-relaxed">
                مرحباً بك في <span className="text-[#C1272D] underline decoration-amber-500 decoration-2 underline-offset-4">المنصة الرقمية الأولى</span> لحصر متطوعي الهلال الأحمر السوداني.
              </p>
              <button type="button" onClick={handleDismissWelcome} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all text-base">
                ابدأ الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الهيدر الاحترافي الفخم (يظل ظاهراً دائماً) */}
      <div className="relative bg-gradient-to-br from-[#8B1519] via-[#C1272D] to-[#A31D22] text-white overflow-hidden pt-10 pb-8 px-4 border-b-4 border-amber-500 shadow-xl">
        <div className="container max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right space-y-3 flex-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-md">جمعية الهلال الأحمر السوداني</h1>
            <p className="text-xs md:text-sm font-bold text-amber-400">فرع ولاية الخرطوم — مكتب طوارئ محلية جبل أولياء</p>
            <div className="pt-1">
              <div className="relative inline-flex flex-col items-center md:items-start bg-black/10 px-4 py-2 rounded-2xl border-r-4 border-amber-500">
                <h4 className="text-base md:text-lg font-black">المنصة الرقمية لحصر وتوثيق المتطوعين</h4>
              </div>
            </div>
          </div>

          {/* كرت العداد الزجاجي (يظل ظاهراً دائماً) */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/15 shadow-2xl min-w-[290px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                حالة الإغلاق: الليلة 11:59 م
              </span>
            </div>
            <div className="flex justify-center items-center gap-2.5">
              {[
                { label: "يوم", value: timeLeft.days, primary: true },
                { label: "ساعة", value: timeLeft.hours },
                { label: "دقيقة", value: timeLeft.minutes },
                { label: "ثانية", value: timeLeft.seconds },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-black text-base md:text-lg shadow-md ${item.primary ? 'bg-amber-500 text-white' : 'bg-white text-slate-900'}`}>
                    {item.value}
                  </div>
                  <span className={`text-[9px] mt-1 font-bold ${item.primary ? 'text-amber-300' : 'text-white/70'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* شريط التحكم السريع (يظل شغالاً دائماً للمشرفين والمستعلميين) */}
      <div className="container max-w-3xl mx-auto px-4 pt-6 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="text-slate-500 hover:text-[#C1272D] hover:bg-slate-200/50 font-bold text-xs rounded-xl px-3 transition-all">
          🔐 تسجيل دخول الادارة
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation("/status")} className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#C1272D] font-bold text-xs rounded-xl px-4 py-2 shadow-sm transition-all">
          🔍 معرفة حالة طلبك السابق
        </Button>
      </div>

      {/* موديول التحكم الذكي والمحتوى المتغير */}
      <div className="container max-w-3xl mx-auto px-4 mt-4">
        
        {timeLeft.ended ? (
          /* 🔒 التعديل المطلوب: الكرت يظهر هنا فقط مكان الاستمارة في حال انتهاء الوقت */
          <div className="bg-white p-8 rounded-[2rem] w-full shadow-xl border border-slate-200 border-t-[6px] border-t-[#C1272D] text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-[#C1272D] rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-sm border border-red-100 animate-pulse">
              🔒
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">عذراً، تم إغلاق باب التسجيل نهائياً</h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              نحيطكم علماً بأن الفترة الزمنية المخصصة لحصر وتوثيق متطوعي الهلال الأحمر السوداني بمحلية جبل أولياء قد انتهت رسمياً في هذا اليوم.
            </p>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              نشكر لكم ثقتكم وحرصكم العالي على العطاء، ويجري حالياً تدقيق ومراجعة البيانات المرفوعة من قبل مشرفي الوحدات ومكتب طوارئ محلية جبل اولياء.
            </p>
            <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold tracking-wide">
              جمعية الهلال الأحمر السوداني — فرع ولاية الخرطوم — مكتب طوارئ محلية جبل أولياء
            </div>
          </div>
        ) : (
          /* 📝 الاستمارة الأصلية تفتح وتشتغل بالكامل هنا طالما الوقت متاح */
          <>
            <div className="bg-white rounded-t-2xl border-t border-x border-slate-200 p-6 pb-4 shadow-sm text-center md:text-right relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">استمارة تسجيل المتطوعين</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">الحقول المميزة بنجمة (<span className="text-[#C1272D]">*</span>) هي حقول إجبارية.</p>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  نسبة الاكتمال: {progressPercent}%
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* 1. كارت البيانات الأساسية */}
                <section className="bg-white rounded-b-2xl rounded-t-none border-b border-x border-slate-200 p-6 md:p-8 border-r-[5px] border-r-[#C1272D] shadow-sm">
                  <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                    <span className="text-xl">📋</span>
                    <h3 className="text-lg font-black text-slate-900">البيانات الأساسية للمتطوع</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700">الاسم الرباعي كاملاً <span className="text-[#C1272D]">*</span></FormLabel>
                        <FormControl><Input placeholder="أدخل اسمك الرباعي كاملاً" className="rounded-xl border-slate-200" {...field} /></FormControl>
                        <FormMessage className="text-xs font-bold" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nationalId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700">الرقم الوطني <span className="text-[#C1272D]">*</span></FormLabel>
                        <FormControl><Input type="text" inputMode="numeric" placeholder="11xxxxxxxxxxx" dir="ltr" className="text-right rounded-xl border-slate-200" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                        <FormMessage className="text-xs font-bold" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-1">
                          <FormLabel className="text-xs font-bold text-slate-700">رقم الهاتف النشط <span className="text-[#C1272D]">*</span></FormLabel>
                          {operatorBadge}
                        </div>
                        <FormControl><Input placeholder="09xxxxxxxx" dir="ltr" className="text-right rounded-xl border-slate-200" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                        <FormMessage className="text-xs font-bold" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="whatsapp" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-600">رقم الواتساب (اختياري)</FormLabel>
                        <FormControl><Input placeholder="09xxxxxxxx" dir="ltr" className="text-right rounded-xl border-slate-200" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="yearOfVolunteering" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">تاريخ بدء العمل التطوعي بالجمعية <span className="text-[#C1272D]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="اختر سنة الالتحاق" /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-[240px] overflow-y-auto rounded-xl">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage className="text-xs font-bold" />
                      </FormItem>
                    )} />
                  </div>
                </section>

                {/* 2. كارت الصورة الشخصية */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-amber-500">
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                    <span className="text-xl">📸</span>
                    <h3 className="text-lg font-black text-slate-900">الصورة الشخصية <span className="text-xs font-normal text-slate-400">(اختياري)</span></h3>
                  </div>
                  <FormField control={form.control} name="photoUrl" render={({ field: { value: _v, ...field } }) => (
                    <FormItem>
                      <div className="flex flex-col gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                            {photoPreview ? <img src={photoPreview} alt="المعاينة" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400 font-bold">لم يتم الإرفاق</span>}
                          </div>
                          <div className="space-y-2 flex-1 w-full text-center sm:text-right">
                            <FormControl><input { ...field } ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} value="" /></FormControl>
                            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => photoInputRef.current?.click()}>📁 اختيار صورة</Button>
                          </div>
                        </div>
                        {rawImageSrc && (
                          <div className="border border-slate-200 bg-white p-4 rounded-xl border-dashed mt-1 space-y-4">
                            <div className="flex flex-col items-center justify-center gap-5 md:flex-row">
                              <div className="w-36 h-36 rounded-full border-[4px] border-emerald-500 overflow-hidden relative bg-slate-100 shrink-0 shadow-md">
                                <img ref={imageElementRef} src={rawImageSrc} alt="المحاذاة" className="w-full h-full object-cover origin-center" style={{ transform: `scale(${imageZoom}) translate(${imagePanX}px, ${imagePanY}px)`, transition: "none" }} />
                              </div>
                              <div className="w-full flex-1 space-y-3 text-xs">
                                <input type="range" min="1" max="4" step="0.1" value={imageZoom} onChange={(e) => setImageZoom(parseFloat(e.target.value))} className="w-full accent-[#C1272D]" />
                                <input type="range" min="-80" max="80" step="1" value={imagePanX} onChange={(e) => setImagePanX(parseInt(e.target.value))} className="w-full accent-slate-700" />
                                <input type="range" min="-80" max="80" step="1" value={imagePanY} onChange={(e) => setImagePanY(parseInt(e.target.value))} className="w-full accent-slate-700" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1.5 border-t">
                              <Button type="button" size="sm" className="bg-emerald-600 text-white" onClick={handleApplyImageAdjustments} disabled={isUploadingPhoto}>✅ اعتماد الصورة</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormItem>
                  )} />
                </section>

                {/* 3. كارت الوحدات الإدارية */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-emerald-600">
                  <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                    <span className="text-xl">📍</span>
                    <h3 className="text-lg font-black text-slate-900">الوحدات الإدارية</h3>
                  </div>
                  <FormField control={form.control} name="unitId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-700">تتبع لأي وحدة بمحلية جبل أولياء <span className="text-[#C1272D]">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder={isLoadingUnits ? "⏳ جاري التحميل..." : "اختر من قائمة الوحدات"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {dbUnits.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.name} {u.sector ? `(${u.sector})` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )} />
                </section>

                {/* 4. كارت السجل التدريبي */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-indigo-600">
                  <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                    <span className="text-xl">🎓</span>
                    <h3 className="text-lg font-black text-slate-900">السجل التدريبي</h3>
                  </div>
                  <FormField control={form.control} name="isTotTrainer" render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xs font-bold text-slate-700">هل أنت مدرب إسعافات أولية معتمد بالجمعية؟ <span className="text-[#C1272D]">*</span></FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-8 bg-slate-50 p-4 rounded-xl border">
                          <div className="flex items-center gap-2"><RadioGroupItem value="true" id="t-yes" /><FormLabel htmlFor="t-yes" className="font-bold cursor-pointer">نعم، مدرب معتمد (TOT)</FormLabel></div>
                          <div className="flex items-center gap-2"><RadioGroupItem value="false" id="t-no" /><FormLabel htmlFor="t-no" className="font-bold cursor-pointer">لا، لست مدرباً</FormLabel></div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )} />

                  {isTotTrainer === "true" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100 mt-5 animate-in slide-in-from-top-4 duration-300">
                      <FormField control={form.control} name="totCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                        <FormItem className="col-span-1 md:col-span-2 border-dashed border-2 p-4 rounded-xl bg-white">
                          <FormLabel className="text-xs font-bold text-slate-700">إرفاق شهادة الـ TOT</FormLabel>
                          <FormControl><input type="file" ref={totCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleTotCertUpload} /></FormControl>
                          <div className="flex items-center gap-3 mt-1.5">
                            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => totCertInputRef.current?.click()} disabled={isUploadingTot}>📁 اختيار الملف</Button>
                            {totCertPreview && <span className="text-xs text-green-700 font-bold">✅ تم الرفع</span>}
                          </div>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="totYear" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-700">سنة الحصول على الشهادة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر السنة" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-[190px] overflow-y-auto">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastFirstAidRefresher" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-slate-700">آخر دورة تنشيطية</FormLabel>
                          <FormControl><Input type="date" className="rounded-xl" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="otherPrograms" render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2 pt-3 border-t">
                          <FormLabel className="text-xs font-bold text-slate-800">هل أنت مدرب في برامج أخرى بالجمعية؟</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر البرنامج" /></SelectTrigger></FormControl>
                            <SelectContent>{OTHER_PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      {otherPrograms && otherPrograms !== "لا" && (
                        <FormField control={form.control} name="otherCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                          <FormItem className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl border border-dashed border-[#C1272D]/30">
                            <FormLabel className="text-xs font-bold text-[#C1272D]">رفع شهادة التخصص للبرنامج الإضافي *</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-3 mt-1">
                                <input type="file" ref={otherCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleOtherCertUpload} />
                                <Button type="button" variant="outline" size="sm" onClick={() => otherCertInputRef.current?.click()} disabled={isUploadingOther}>📁 اختيار الملف</Button>
                                {otherCertPreview && <span className="text-xs text-green-700 font-bold">✅ جاهز</span>}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs font-bold" />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  )}
                </section>

                {/* 5. كارت الوضع الحالي والتوافر */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-blue-600">
                  <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                    <span className="text-xl">🏃‍♂️</span>
                    <h3 className="text-lg font-black text-slate-900">الوضعية الجغرافية والجاهزية</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="currentStatusInKhartoum" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-700">أين موقعك الآن <span className="text-[#C1272D]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="اختر مكان تواجدك الحالي" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="موجود حالياً">موجود حالياً داخل الولاية</SelectItem>
                            <SelectItem value="خ خارج الخرطوم">في الولايات - خارج ولاية الخرطوم</SelectItem>
                            <SelectItem value="مسافر خارج البلاد">خارج السودان تماماً</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs font-bold" />
                      </FormItem>
                    )} />
                    {currentStatusInKhartoum && currentStatusInKhartoum !== "موجود حالياً" && (
                      <FormField control={form.control} name="expectedReturnTime" render={({ field }) => (
                        <FormItem className="animate-in slide-in-from-right-2 duration-200">
                          <FormLabel className="text-xs font-bold text-slate-700">متى ستعود لولاية الخرطوم</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="حدد المدة الزمنية" /></SelectTrigger></FormControl>
                            <SelectContent>{["بعد شهر","بعد شهرين","بعد 3 أشهر","غير محدد"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    )}
                    <FormField control={form.control} name="availabilityLevel" render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel className="text-xs font-bold text-slate-700">هل أنت متفرغ لأنشطة الجمعية؟ <span className="text-[#C1272D]">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر مستوى التوافر" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="متاح بالكامل">متاح بالكامل</SelectItem>
                            <SelectItem value="متاح جزئياً">متاح جزئياً</SelectItem>
                            <SelectItem value="غير متاح حالياً">غير متاح في الوقت الراهن</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs font-bold" />
                      </FormItem>
                    )} />
                  </div>
                </section>

                {/* 6. كارت الالتزام والمصادقة اللائحية */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-slate-800">
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                    <span className="text-xl">⚖️</span>
                    <h3 className="text-lg font-black text-slate-900">المصادقة والمسؤولية المؤسسية</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <a href="/guide.pdf" target="_blank" rel="noopener noreferrer" className="text-[#C1272D] hover:underline font-bold flex items-center gap-2 text-sm">
                      📖 اضغط هنا لقراءة دليل تنمية المتطوعين المعتمد (PDF)
                    </a>
                    <FormField control={form.control} name="agreedToTerms" render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0 pt-2 border-t">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 border-slate-300 data-[state=checked]:bg-[#C1272D] rounded-md scale-110" />
                        </FormControl>
                        <FormLabel className="font-bold text-slate-700 cursor-pointer text-xs md:text-sm leading-relaxed block select-none">
                          أقر وأوافق تماماً على جميع الضوابط، الالتزامات القانونية، والقيم الأساسية الواردة بدليل تنمية المتطوعين لجمعية الهلال الأحمر السوداني. <span className="text-[#C1272D]">*</span>
                        </FormLabel>
                        <FormMessage className="text-xs font-bold block" />
                      </FormItem>
                    )} />
                  </div>
                </section>
                
                {/* زر الإرسال */}
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full text-base h-14 bg-gradient-to-r from-[#A31D22] via-[#C1272D] to-[#8B1519] text-white font-black rounded-2xl shadow-xl" 
                    disabled={form.formState.isSubmitting || isUploadingPhoto || isUploadingTot || isUploadingOther}
                  >
                    {form.formState.isSubmitting ? "⚡ جاري الحفظ ..." : "تسجيل متطوع جديد"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </div>

      {/* الفوتر الاحترافي المنقّح */}
      <footer className="mt-16 pb-12 text-center border-t border-slate-200 pt-8 bg-slate-50/50">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3">
          <p className="text-slate-500 text-xs md:text-sm font-bold">جميع الحقوق محفوظة لدى <span className="text-[#C1272D] font-black mx-0.5">جمعية الهلال الأحمر السوداني</span> &copy; 2026</p>
          <div dir="ltr" className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-200">
            <span>Developed with</span><span className="inline-block text-[#C1272D]">❤️</span><span>by</span><span className="text-slate-800 font-black">Loai Jafer & Hazim mohammed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
