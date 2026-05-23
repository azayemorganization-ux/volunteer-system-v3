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

  // إعدادات كلاودنري
  const CLOUDINARY_CLOUD_NAME = "ddznegswc";
  const CLOUDINARY_UPLOAD_PRESET = "kaee3l5k";

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingTot, setIsUploadingTot] = useState(false);
  const [isUploadingOther, setIsUploadingOther] = useState(false);

  // حالات المعاينة والتحكم بالصورة الشخصية (Zoom & Pan)
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

  // ضبط العداد لينتهي رسمياً في 30 يونيو 2026
  useEffect(() => {
    const targetDate = new Date("2026-06-30T23:59:59").getTime();
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

  // تتبع حي لحساب نسبة اكتمال الحقول الإجبارية لشريط التقدم
  const watchedValues = form.watch();
  const requiredFields = ["fullName", "nationalId", "phone", "yearOfVolunteering", "unitId", "currentStatusInKhartoum", "availabilityLevel", "agreedToTerms"];
  const filledRequiredCount = requiredFields.filter(field => {
    const val = watchedValues[field as keyof FormValues];
    if (typeof val === "boolean") return val === true;
    if (typeof val === "number") return val > 0;
    return !!val;
  }).length;
  const progressPercent = Math.round((filledRequiredCount / requiredFields.length) * 100);

  // منطق التعرف التلقائي على مشغل الاتصالات السوداني بناءً على البادئة
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
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);

      ctx.save();
      ctx.translate(200, 200);
      ctx.scale(imageZoom, imageZoom);
      
      const viewPortSize = 160;
      const scaleFactor = 400 / viewPortSize;
      ctx.translate(imagePanX * scaleFactor, imagePanY * scaleFactor);

      const img = imageElementRef.current;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      
      let dWidth = 400;
      let dHeight = 400;
      
      if (imgRatio > 1) {
        dWidth = 400 * imgRatio;
      } else {
        dHeight = 400 / imgRatio;
      }

      ctx.drawImage(img, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
      ctx.restore();

      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.88);
      setPhotoPreview(croppedBase64);

      try {
        const cloudinaryUrl = await uploadToCloudinary(croppedBase64);
        form.setValue("photoUrl", cloudinaryUrl, { shouldValidate: true });
        setRawImageSrc(null);
        toast({ title: "تم ضبط ومحاذاة الصورة", description: "تم حفظ الصورة بالشكل المتناسق." });
      } catch (error) {
        toast({ variant: "destructive", title: "خطأ في النظام", description: "فشل حفظ الصورة المعدلة، يرجى المحاولة مجدداً." });
        setPhotoPreview(null);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleTotCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingTot(true);
    const reader = new FileReader();
    reader.onloadend = () => setTotCertPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("totCertificateUrl", cloudinaryUrl, { shouldValidate: true });
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "لم يتم حفظ شهادة الـ TOT." });
      setTotCertPreview(null);
    } finally {
      setIsUploadingTot(false);
    }
  };

  const handleOtherCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingOther(true);
    const reader = new FileReader();
    reader.onloadend = () => setOtherCertPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("otherCertificateUrl", cloudinaryUrl, { shouldValidate: true });
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "لم يتم حفظ الشهادة التخصصية" });
      setOtherCertPreview(null);
    } finally {
      setIsUploadingOther(false);
    }
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
        toast({ title: "تم التسجيل بنجاح", description: "شكراً لك على تسجيل بياناتك وفخرنا بك!" });
        setLocation("/success");
      } else {
        throw new Error(result.error || "حدث خطأ في التسجيل");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ في التسجيل", description: err.message || "حدث خطأ غير متوقع" });
    }
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
              <div className="absolute top-3 right-3 text-white/20 text-xs font-mono select-none">v3.0</div>
              <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md border-2 border-white/20 shadow-lg">
                 <span className="text-4xl">🇸🇩</span>
              </div>
              <h2 className="text-2xl font-black mb-1 tracking-tight">فخر جبل أولياء</h2>
              <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase opacity-90">Digital Pioneer in Sudan</p>
            </div>
            <div className="p-8 text-center space-y-5 bg-gradient-to-b from-white to-slate-50">
              <p className="text-slate-800 text-lg font-bold leading-relaxed">
                مرحباً بك في <span className="text-[#C1272D] underline decoration-amber-500 decoration-2 underline-offset-4">المنصة الرقمية الأولى</span> لحصر متطوعي الهلال الأحمر السوداني.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                هذا التطور التاريخي انطلق من محلية جبل أولياء، وبسواعدكم وخبراتكم نصنع مستقبلاً رقمياً جديداً لجمعيتنا العريقة بمواصفات عالمية.
              </p>
              <button 
                type="button"
                onClick={handleDismissWelcome}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group text-base"
              >
                <span>فخور بالانضمام .. ابدأ الآن</span>
                <span className="text-xl group-hover:translate-x-[-4px] transition-transform">←</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الهيدر الاحترافي الفخم */}
      <div className="relative bg-gradient-to-br from-[#8B1519] via-[#C1272D] to-[#A31D22] text-white overflow-hidden pt-10 pb-8 px-4 border-b-4 border-amber-500 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_50%)]"></div>
        <div className="container max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right space-y-3 flex-1">
            <div className="inline-flex px-3 py-1 bg-black/15 backdrop-blur-md rounded-full text-[10px] border border-white/10 font-bold opacity-90 tracking-wide mb-1">
              بِسمِ اللَّهِ الرَّحمَنِ الرَّحِيمِ
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-md leading-tight">
                جمعية الهلال الأحمر السوداني
              </h1>
              <p className="text-xs md:text-sm font-bold text-amber-400 tracking-wide">
                فرع ولاية الخرطوم — مكتب طوارئ محلية جبل أولياء
              </p>
            </div>
            <div className="pt-1">
              <div className="relative inline-flex flex-col items-center md:items-start bg-black/10 px-4 py-2 rounded-2xl border-r-4 border-amber-500 backdrop-blur-sm">
                <h4 className="text-base md:text-lg font-black tracking-tight">
                  المنصة الرقمية لحصر وتوثيق المتطوعين
                </h4>
                <span className="text-[8px] font-mono tracking-widest text-white/40 uppercase mt-0.5">
                  Digital Platform for Volunteers
                </span>
              </div>
            </div>
          </div>

          {/* العداد بتأثير زجاجي منسق */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/15 shadow-2xl min-w-[290px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                ينتهي الحصر: 30 يونيو 2026
              </span>
              <span className="text-[8px] opacity-40 font-mono tracking-wider uppercase">Timer</span>
            </div>
            <div className="flex justify-center items-center gap-2.5">
              {[
                { label: "يوم", value: timeLeft.days, primary: true },
                { label: "ساعة", value: timeLeft.hours },
                { label: "دقيقة", value: timeLeft.minutes },
                { label: "ثانية", value: timeLeft.seconds },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className={`
                    w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-black text-base md:text-lg relative overflow-hidden transition-all shadow-md
                    ${item.primary ? 'bg-amber-500 text-white font-black' : 'bg-white text-slate-900'}
                  `}>
                    {item.value}
                  </div>
                  <span className={`text-[9px] mt-1 font-bold ${item.primary ? 'text-amber-300' : 'text-white/70'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* شريط التحكم السريع المحدث */}
      <div className="container max-w-3xl mx-auto px-4 pt-6 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="text-slate-500 hover:text-[#C1272D] hover:bg-slate-200/50 font-bold text-xs rounded-xl px-3 transition-all">
          🔐 تسجيل دخول الادارة
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation("/status")} className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#C1272D] font-bold text-xs rounded-xl px-4 py-2 shadow-sm transition-all">
          🔍 معرفة حالة طلبك السابق
        </Button>
      </div>

      {/* موديول الاستمارة الرئيسي */}
      <div className="container max-w-3xl mx-auto px-4 mt-4">
        
        {/* الترويسة الإرشادية المضافة حديثاً مع شريط التقدم الفخم */}
        <div className="bg-white rounded-t-2xl border-t border-x border-slate-200 p-6 pb-4 shadow-sm text-center md:text-right relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">استمارة تسجيل</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                يرجى تعبئة جميع الحقول التالية. الحقول المميزة بنجمة (<span className="text-[#C1272D]">*</span>) هي حقول إجبارية.
              </p>
            </div>
            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              نسبة الاكتمال: {progressPercent}%
            </div>
          </div>
          {/* شريط التقدم الذكي */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* 1. كارت البيانات الأساسية */}
            <section className="bg-white rounded-b-2xl rounded-t-none border-b border-x border-slate-200 p-6 md:p-8 border-r-[5px] border-r-[#C1272D] shadow-sm transition-all hover:shadow-md duration-300 group">
              <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                <span className="text-xl">📋</span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#C1272D] transition-colors">البيانات الأساسية للمتطوع</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                    <FormLabel className="text-xs font-bold text-slate-700">الاسم الرباعي كاملاً <span className="text-[#C1272D]">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسمك الرباعي متطابقاً مع الوثائق الرسمية" className="rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#C1272D]/10 focus-visible:border-[#C1272D] h-11 text-sm font-medium transition-all" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="nationalId" render={({ field }) => (
                  <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                    <FormLabel className="text-xs font-bold text-slate-700">الرقم الوطني <span className="text-[#C1272D]">*</span></FormLabel>
                    <FormControl>
                      <Input type="text" inputMode="numeric" placeholder="11xxxxxxxxxxx" dir="ltr" className="text-right rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#C1272D]/10 focus-visible:border-[#C1272D] h-11 text-sm font-semibold transition-all" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} />
                    </FormControl>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="text-xs font-bold text-slate-700">رقم الهاتف النشط حالياً <span className="text-[#C1272D]">*</span></FormLabel>
                      {operatorBadge}
                    </div>
                    <FormControl>
                      <Input placeholder="09xxxxxxxx" dir="ltr" className="text-right rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#C1272D]/10 focus-visible:border-[#C1272D] h-11 text-sm font-semibold transition-all" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} />
                    </FormControl>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                    <FormLabel className="text-xs font-bold text-slate-600">رقم الواتساب <span className="text-slate-400 font-normal">(اختياري)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="09xxxxxxxx" dir="ltr" className="text-right rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#C1272D]/10 focus-visible:border-[#C1272D] h-11 text-sm font-semibold transition-all" {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} />
                    </FormControl>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="yearOfVolunteering" render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2 focus-within:translate-x-[-2px] transition-transform duration-200">
                    <FormLabel className="text-xs font-bold text-slate-700">تاريخ بدء العمل التطوعي الفعلي بالجمعية <span className="text-[#C1272D]">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-[#C1272D]/10 focus:border-[#C1272D] h-11 text-sm font-medium transition-all">
                          <SelectValue placeholder="اضغط لاختيار سنة الالتحاق الرسمية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[240px] overflow-y-auto rounded-xl shadow-xl">{years.map((y) => <SelectItem key={y} value={y.toString()} className="font-medium">{y}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* 2. كارت الصورة الشخصية (موزع ومنسق لحفظ المساحة والمرونة للمنتقبات) */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-amber-500 transition-all hover:shadow-md duration-300">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                <span className="text-xl">📸</span>
                <h3 className="text-lg font-black text-slate-900">الصورة الشخصية  <span className="text-xs font-normal text-slate-400">(اختياري)</span></h3>
              </div>
              
              <div className="mb-4 text-xs font-medium text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-1">
                <p className="text-amber-900 font-bold">⚠️ تنبيهات هامة بخصوص الصورة الشخصية:</p>
                <ul className="list-disc list-inside space-y-1 pr-1 text-slate-600 text-[11px]">
                  <li>إرفاق الصورة الشخصية <strong>(اختياري تماماً)</strong> وليس إجبارياً لإتمام التسجيل.</li>
                  <li>في حال إرفاقها، <strong>ستظهر هذه الصورة في بطاقتك الرقمية المعتمدة</strong> الصادرة من النظام.</li>
                  <li>يرجى الحرص على رفع صورة <strong>بخلفية سادة تماماً</strong> لضمان جودة وتناسق التصميم.</li>
                </ul>
              </div>

              <FormField control={form.control} name="photoUrl" render={({ field: { value: _v, ...field } }) => (
                <FormItem>
                  <div className="flex flex-col gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/60">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                        {photoPreview ? (
                          <img src={photoPreview} alt="المعاينة" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="text-center p-2">
                            <span className="block text-xl opacity-30">👤</span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">لم يتم الإرفاق</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2 flex-1 w-full text-center sm:text-right">
                        <FormControl>
                          <input { ...field } ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} value="" />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-[#C1272D]/5 hover:text-[#C1272D] font-bold rounded-xl px-4 py-2 transition-all shadow-sm" onClick={() => photoInputRef.current?.click()}>
                          {photoPreview ? "🔄 استبدال الصورة الحالية" : "📁 اختيار صورة من الجهاز"}
                        </Button>
                        <p className="text-[10px] text-slate-400 block font-medium">يمكنك استخدام لوحة المحاذاة التفاعلية في حال ظهورها لضبط أبعاد وجهك بالمركز.</p>
                      </div>
                    </div>

                    {/* ستوديو تعديل ومعاينة الحقول البكسلية الحي */}
                    {rawImageSrc && (
                      <div className="border border-slate-200 bg-white p-4 rounded-xl border-dashed mt-1 space-y-4 animate-in zoom-in-95 duration-200 shadow-sm">
                        <p className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 text-[#C1272D]">⚙️ محرر محاذاة الصورة الشخصية بالمركز</p>
                        
                        <div className="flex flex-col items-center justify-center gap-5 md:flex-row">
                          <div className="w-36 h-36 rounded-full border-[4px] border-emerald-500 overflow-hidden relative bg-slate-100 shrink-0 shadow-md ring-4 ring-emerald-500/10">
                            <img 
                              ref={imageElementRef}
                              src={rawImageSrc} 
                              alt="محرر المحاذاة" 
                              className="w-full h-full object-cover origin-center"
                              style={{
                                transform: `scale(${imageZoom}) translate(${imagePanX}px, ${imagePanY}px)`,
                                transition: "none"
                              }}
                            />
                          </div>

                          <div className="w-full flex-1 space-y-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md"><span>🔍 حجم وتكبير الصورة:</span><span className="font-mono text-[#C1272D]">{imageZoom.toFixed(1)}x</span></div>
                              <input type="range" min="1" max="4" step="0.1" value={imageZoom} onChange={(e) => setImageZoom(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#C1272D]" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md"><span>↔️ تحريك يمين / يسار:</span><span className="font-mono text-slate-700">{imagePanX}px</span></div>
                              <input type="range" min="-80" max="80" step="1" value={imagePanX} onChange={(e) => setImagePanX(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md"><span>↕️ تحريك أعلى / أسفل:</span><span className="font-mono text-slate-700">{imagePanY}px</span></div>
                              <input type="range" min="-80" max="80" step="1" value={imagePanY} onChange={(e) => setImagePanY(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700" />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-100">
                          <Button type="button" variant="ghost" size="sm" className="text-xs text-slate-400 hover:bg-slate-50 font-bold rounded-lg" onClick={() => setRawImageSrc(null)}>إلغاء الأمر</Button>
                          <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg px-4 shadow-md transition-all" onClick={handleApplyImageAdjustments} disabled={isUploadingPhoto}>
                            {isUploadingPhoto ? "🔄 جاري التثبيت والرفع..." : "✅ اعتماد الصورة الموزونة"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage className="text-xs font-bold" />
                </FormItem>
              )} />
            </section>

            {/* 3. كارت الوحدات الادارية لمكتب طوارئ جبل اولياء */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-emerald-600 transition-all hover:shadow-md duration-300">
              <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                <span className="text-xl">📍</span>
                <h3 className="text-lg font-black text-slate-900">الوحدات الادارية لمكتب طوارئ جبل اولياء</h3>
              </div>
              
              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                  <FormLabel className="text-xs font-bold text-slate-700">تتبع لأي وحدة بمحلية جبل اولياء <span className="text-[#C1272D]">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 h-11 text-sm font-medium transition-all">
                        <SelectValue placeholder={isLoadingUnits ? "⏳ جاري تحميل الوحدات ..." : "اضغط للاختيار من قائمة الوحدات المفعلة"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-xl">
                      {dbUnits.length > 0 ? (
                        dbUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()} className="font-medium">{u.name} {u.sector ? `(${u.sector})` : ""}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="0" disabled>لا توجد وحدات متوفرة حالياً</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs font-bold" />
                </FormItem>
              )} />
            </section>

            {/* 4. كارت السجل التدريبي المعني بالصياغة الجديدة */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-indigo-600 transition-all hover:shadow-md duration-300">
              <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                <span className="text-xl">🎓</span>
                <h3 className="text-lg font-black text-slate-900">السجل التدريبي</h3>
              </div>
              
              <FormField control={form.control} name="isTotTrainer" render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-xs font-bold text-slate-700">هل أنت مدرب إسعافات أولية معتمد بالجمعية؟ <span className="text-[#C1272D]">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4 sm:gap-8 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-2.5 cursor-pointer">
                        <RadioGroupItem value="true" id="tot-yes" className="accent-[#C1272D]" />
                        <FormLabel htmlFor="tot-yes" className="cursor-pointer text-sm font-bold text-slate-700">نعم، مدرب معتمد</FormLabel>
                      </div>
                      <div className="flex items-center gap-2.5 cursor-pointer">
                        <RadioGroupItem value="false" id="tot-no" className="accent-[#C1272D]" />
                        <FormLabel htmlFor="tot-no" className="cursor-pointer text-sm font-bold text-slate-700">لا، لست مدرباً</FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />

              {isTotTrainer === "true" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100 mt-5 animate-in slide-in-from-top-4 duration-300">
                  <FormField control={form.control} name="totCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                    <FormItem className="col-span-1 md:col-span-2 border-dashed border-2 border-slate-200 p-4 rounded-xl bg-white shadow-inner-sm">
                      <FormLabel className="text-xs font-bold text-slate-700">إرفاق شهادة الTOT للاسعافات الاولية <span className="text-slate-400 font-normal">(اختياري)</span></FormLabel>
                      <FormControl><input type="file" ref={totCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleTotCertUpload} disabled={isUploadingTot} /></FormControl>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Button type="button" variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-all shadow-sm" onClick={() => totCertInputRef.current?.click()} disabled={isUploadingTot}>📁 اختيار الملف</Button>
                        {isUploadingTot && <span className="text-xs text-amber-600 font-bold animate-pulse">⏳ جاري حفظ الملف...</span>}
                        {totCertPreview && !isUploadingTot && <span className="text-xs text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-200">✅ تم الرفع بنجاح</span>}
                      </div>
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="totYear" render={({ field }) => (
                    <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                      <FormLabel className="text-xs font-bold text-slate-700">السنة التي حصلت فيها على شهادة ال TOT</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 h-11 text-sm font-medium">
                            <SelectValue placeholder="اختر السنة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[190px] overflow-y-auto rounded-xl shadow-xl">{years.map((y) => <SelectItem key={y} value={y.toString()} className="font-medium">{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="lastFirstAidRefresher" render={({ field }) => (
                    <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                      <FormLabel className="text-xs font-bold text-slate-700">متى تلقيت آخر دورة تنشيطية</FormLabel>
                      <FormControl><Input type="date" className="rounded-xl border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-600 h-11 text-sm font-medium transition-all" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="otherPrograms" render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2 pt-3 border-t border-indigo-100/60 mt-2">
                      <FormLabel className="text-xs font-bold text-slate-800">هل انت مدرب في برامج اخرى من برامج الجمعية؟</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 h-11 text-sm font-medium">
                            <SelectValue placeholder="اختر البرنامج الإضافي إن وجد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl shadow-xl">{OTHER_PROGRAMS.map(p => <SelectItem key={p} value={p} className="font-medium">{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  {otherPrograms && otherPrograms !== "لا" && (
                    <FormField control={form.control} name="otherCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                      <FormItem className="col-span-1 md:col-span-2 bg-white/80 p-4 rounded-xl border border-dashed border-[#C1272D]/30 animate-in zoom-in-95 duration-200 shadow-sm">
                        <FormLabel className="text-xs font-bold text-[#C1272D] flex items-center gap-1">يجب رفع شهادة التخصص للبرنامج الإضافي <span className="text-[#C1272D]">*</span></FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <input type="file" ref={otherCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleOtherCertUpload} disabled={isUploadingOther} />
                            <div className="flex items-center gap-3 mt-1">
                              <Button type="button" variant="outline" size="sm" onClick={() => otherCertInputRef.current?.click()} className="border-[#C1272D]/20 text-[#C1272D] hover:bg-[#C1272D]/5 font-bold rounded-xl shadow-sm transition-all" disabled={isUploadingOther}>📁 اختيار الملف</Button>
                              {isUploadingOther && <span className="text-xs text-amber-600 font-bold animate-pulse">⏳ جاري الحفظ...</span>}
                              {otherCertPreview && !isUploadingOther && <span className="text-xs text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-200">✅ جاهز للرفع</span>}
                            </div>
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
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-blue-600 transition-all hover:shadow-md duration-300">
              <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                <span className="text-xl">🏃‍♂️</span>
                <h3 className="text-lg font-black text-slate-900">الوضعية الجغرافية والجاهزية</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="currentStatusInKhartoum" render={({ field }) => (
                  <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200">
                    <FormLabel className="text-xs font-bold text-slate-700">اين موقعك الآن <span className="text-[#C1272D]">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 h-11 text-sm font-medium">
                          <SelectValue placeholder="اختر مكان تواجدك الحالي بدقة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="موجود حالياً" className="font-medium">موجود حالياً داخل الولاية</SelectItem>
                        <SelectItem value="خ خارج الخرطوم" className="font-medium">في الولايات - خارج ولاية الخرطوم</SelectItem>
                        <SelectItem value="مسافر خارج البلاد" className="font-medium">خارج السودان تماماً</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
                
                {currentStatusInKhartoum && currentStatusInKhartoum !== "موجود حالياً" && (
                  <FormField control={form.control} name="expectedReturnTime" render={({ field }) => (
                    <FormItem className="focus-within:translate-x-[-2px] transition-transform duration-200 animate-in slide-in-from-right-2 duration-200">
                      <FormLabel className="text-xs font-bold text-slate-700">متى ستعود لولاية الخرطوم</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 h-11 text-sm font-medium">
                            <SelectValue placeholder="حدد المدة الزمنية التقريبية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl shadow-xl">{["بعد شهر","بعد شهرين","بعد 3 أشهر","بعد 4 أشهر","بعد 5 أشهر","بعد 6 أشهر","بعد سنة","غير محدد"].map((v) => <SelectItem key={v} value={v} className="font-medium">{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )} />
                )}
                
                <FormField control={form.control} name="availabilityLevel" render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2 focus-within:translate-x-[-2px] transition-transform duration-200">
                    <FormLabel className="text-xs font-bold text-slate-700">هل انت متفرغ لانشطة الجمعية؟ <span className="text-[#C1272D]">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 h-11 text-sm font-medium">
                          <SelectValue placeholder="اختر مستوى التوافر" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="متاح بالكامل" className="font-medium">متاح بالكامل</SelectItem>
                        <SelectItem value="متاح جزئياً" className="font-medium">متاح جزئياً</SelectItem>
                        <SelectItem value="غير متاح حالياً" className="font-medium">غير متاح في الوقت الراهن</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs font-bold" />
                  </FormItem>
                )} />
              </div>
            </section>

            {/* 6. كارت الالتزام والمصادقة اللائحية */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 border-r-[5px] border-r-slate-800 transition-all hover:shadow-md duration-300">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                <span className="text-xl">⚖️</span>
                <h3 className="text-lg font-black text-slate-900">المصادقة والمسؤولية المؤسسية</h3>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-inner-sm">
                {/* تم تعديل الرابط هنا ليوجه للملف الجديد مباشرة */}
                <a href="/guide.pdf" target="_blank" rel="noopener noreferrer" className="text-[#C1272D] hover:text-[#8B1519] hover:underline font-bold flex items-center gap-2 text-sm transition-colors">
                  📖 اضغط هنا لقراءة دليل تنمية المتطوعين المعتمد بجمعية الهلال الأحمر السوداني (ملف PDF رسمي)
                </a>

                <FormField control={form.control} name="agreedToTerms" render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0 pt-2 border-t border-slate-200/60">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1 border-slate-300 data-[state=checked]:bg-[#C1272D] data-[state=checked]:border-[#C1272D] rounded-md transition-all scale-110" />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="font-bold text-slate-700 cursor-pointer text-xs md:text-sm leading-relaxed block select-none">
                        أقر وأوافق تماماً على جميع الضوابط، الالتزامات القانونية، والقيم الأساسية الواردة بدليل تنمية المتطوعين لجمعية الهلال الأحمر السوداني. <span className="text-[#C1272D]">*</span>
                      </FormLabel>
                    </div>
                    <FormMessage className="text-xs font-bold block" />
                  </FormItem>
                )} />
              </div>
            </section>
            
            {/* زر الإرسال المحدث */}
            <div className="pt-2">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full text-base h-14 bg-gradient-to-r from-[#A31D22] via-[#C1272D] to-[#8B1519] hover:from-[#C1272D] hover:to-[#8B1519] text-white font-black rounded-2xl shadow-xl shadow-[#C1272D]/10 transition-all transform active:scale-[0.99]" 
                disabled={form.formState.isSubmitting || timeLeft.ended || isUploadingPhoto || isUploadingTot || isUploadingOther}
              >
                {timeLeft.ended 
                  ? "🔒 انتهى زمن الحصر والتسجيل الرسمي" 
                  : (isUploadingPhoto || isUploadingTot || isUploadingOther)
                    ? "⏳ يرجى الانتظار حتى اكتمال معالجة ورفع الملفات..."
                    : form.formState.isSubmitting 
                      ? "⚡ جاري مراجعة وحفظ البيانات ..." 
                      : "تسجيل متطوع جديد"
                }
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* الفوتر الاحترافي المنقّح والمعدّل بالكامل */}
      <footer className="mt-16 pb-12 text-center border-t border-slate-200 pt-8 bg-slate-50/50">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3">
          <div>
            <p className="text-slate-500 text-xs md:text-sm font-bold">جميع الحقوق محفوظة لدى <span className="text-[#C1272D] font-black mx-0.5">جمعية الهلال الأحمر السوداني</span> &copy; 2026</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider">مكتب طوارئ محلية جبل أولياء — التحول الرقمي</p>
          </div>
          <div className="mt-2">
            <div dir="ltr" className="flex items-center justify-center gap-1.5 text-[10px] md:text-xs text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-inner-sm">
              <span>Developed with</span><span className="inline-block text-[#C1272D] animate-pulse">❤️</span><span>by</span><span className="text-slate-800 font-black tracking-tight">Loai Jafer & Hazim mohammed</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
