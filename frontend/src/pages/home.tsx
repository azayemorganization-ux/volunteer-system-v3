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

// تعريف نوع البيانات الخاصة بالوحدات لضمان سلامة الكود
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
  unitId: z.coerce.number().min(1, "يجب اختيار الوحدة"),
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
        console.log('📡 تم إرسال نغزة التصحية للسيرفر بنجاح.. جاري الاستيقاظ!');
      } catch (error) {
        console.log('Silent ping sent to server.');
      }
    };

    wakeUpServer();
  }, []);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });
  
  // المخزن الديناميكي للوحدات القادمة من قاعدة البيانات
  const [dbUnits, setDbUnits] = useState<UnitType[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  // إعدادات كلاودنري السحرية
  const CLOUDINARY_CLOUD_NAME = "ddznegswc";
  const CLOUDINARY_UPLOAD_PRESET = "kaee3l5k"; // <--- ضع اسم الـ Preset حقك هنا يا هندسة

  // حالات تحميل المرفقات السحابية (تمنع الحفظ النهائي أثناء الرفع)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingTot, setIsUploadingTot] = useState(false);
  const [isUploadingOther, setIsUploadingOther] = useState(false);

  // معاينات الملفات المرفوعة محلياً للشاشة
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [totCertPreview, setTotCertPreview] = useState<string | null>(null);
  const [otherCertPreview, setOtherCertPreview] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const totCertInputRef = useRef<HTMLInputElement>(null);
  const otherCertInputRef = useRef<HTMLInputElement>(null);

  // رابط سيرفر ريندر المعتمد
  const SERVER_URL = "https://volunteer-system-v3.onrender.com";

  // دالة الرفع المباشرة والآمنة إلى سيرفر Cloudinary
  const uploadToCloudinary = async (fileOrBase64: File | string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", fileOrBase64);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("فشل رفع الملف إلى السيرفر السحابي");
    }

    const data = await response.json();
    return data.secure_url; // الرابط النصي الصغير للـ URL المباشر
  };

  // جلب الوحدات ديناميكياً من السيرفر عند تحميل الصفحة
  useEffect(() => {
    const fetchLiveUnits = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/units`);
        if (!response.ok) throw new Error("فشل جلب الوحدات من السيرفر");
        const data = await response.json();
        setDbUnits(data);
      } catch (error) {
        console.error("Error fetching units:", error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب الوحدات",
          description: "فشل السيرفر في تحميل الوحدات، تأكد من اتصال قاعدة البيانات.",
        });
      } finally {
        setIsLoadingUnits(false);
      }
    };

    fetchLiveUnits();
  }, [toast]);

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

  const [showWelcome, setShowWelcome] = useState(true);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "", nationalId: "", phone: "", whatsapp: "", yearOfVolunteering: "",
      unitId: 0, photoUrl: "", isTotTrainer: "false", totYear: "", totCertificateUrl: "",
      otherCertificateUrl: "",
      lastFirstAidRefresher: "", otherPrograms: "لا", currentStatusInKhartoum: "",
      expectedReturnTime: "", availabilityLevel: "", agreedToTerms: false,
    },
  });

  const isTotTrainer = form.watch("isTotTrainer");
  const otherPrograms = form.watch("otherPrograms");
  const currentStatusInKhartoum = form.watch("currentStatusInKhartoum");

  // معالجة وضغط الصورة الشخصية ورفعها سحابياً
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "الصورة كبيرة جداً", description: "يجب أن يكون حجم الصورة أقل من 3 ميغابايت" });
      return;
    }
    
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = async () => {
        const maxDim = 600;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.82);
        
        setPhotoPreview(compressedBase64); // عرض المعاينة فوراً للمستخدم بالـ base64 المخفف

        try {
          const cloudinaryUrl = await uploadToCloudinary(compressedBase64);
          form.setValue("photoUrl", cloudinaryUrl, { shouldValidate: true });
        } catch (error) {
          toast({ variant: "destructive", title: "خطأ سحابي", description: "فشل رفع الصورة الشخصية لـ Cloudinary" });
          setPhotoPreview(null);
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // معالجة ورفع شهادة TOT سحابياً
  const handleTotCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTot(true);
    
    // لعمل المعاينة السريعة للشاشة
    const reader = new FileReader();
    reader.onloadend = () => {
      setTotCertPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("totCertificateUrl", cloudinaryUrl, { shouldValidate: true });
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "لم يتم حفظ شهادة الـ TOT سحابياً، أعد المحاولة." });
      setTotCertPreview(null);
    } finally {
      setIsUploadingTot(false);
    }
  };

  // معالجة ورفع الشهادات الإضافية الأخرى سحابياً
  const handleOtherCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingOther(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setOtherCertPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      form.setValue("otherCertificateUrl", cloudinaryUrl, { shouldValidate: true });
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في الرفع", description: "لم يتم حفظ الشهادة التخصصية سحابياً" });
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
        body: JSON.stringify({
          ...data,
          isTotTrainer: data.isTotTrainer === "true", 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem("volunteerData", JSON.stringify(result));
        toast({ title: "تم التسجيل بنجاح", description: "شكراً لك على مشاركتك وفخرنا بك!" });
        setLocation("/success");
      } else {
        throw new Error(result.error || "حدث خطأ في التسجيل");
      }
    } catch (err: any) {
      console.error("Submission Error:", err);
      toast({
        variant: "destructive",
        title: "خطأ في التسجيل",
        description: err.message || "حدث خطأ غير متوقع",
      });
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-muted/30 pb-12" dir="rtl">
      {/* الترحيب الأولي المنبثق */}
      {showWelcome && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative bg-white/5 backdrop-blur-3xl rounded-[3rem] max-w-lg w-full overflow-hidden shadow-2xl border border-white/10 transform animate-in zoom-in duration-700">
            <div className="bg-gradient-to-br from-[#A31D22] via-[#C1272D] to-[#8B1519] p-10 text-center text-white border-b-8 border-yellow-500">
              <div className="w-24 h-24 bg-white/10 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-lg border-4 border-white/20 shadow-xl">
                 <span className="text-5xl">🇸🇩</span>
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tighter">فخر جبل أولياء</h2>
              <p className="text-[11px] text-yellow-400 font-bold tracking-[0.3em] uppercase opacity-80">Digital Pioneer in Sudan</p>
            </div>
            <div className="p-10 text-center space-y-6">
              <p className="text-white text-xl font-bold leading-relaxed">
                مرحباً بك في <span className="text-yellow-400 italic">المنصة الرقمية الأولى</span> لحصر متطوعي الهلال الأحمر السوداني على مستوى السودان.
              </p>
              <p className="text-sm text-white/80 leading-loose font-medium">
                هذا التطور التاريخي انطلق من محلية جبل أولياء، بسواعدكم نصنع مستقبلاً رقمياً جديداً لجمعية الهلال الأحمر السوداني.
              </p>
              <button 
                type="button"
                onClick={() => setShowWelcome(false)}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-[#630D11] font-black py-5 rounded-3xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 group"
              >
                فخور بالانضمام .. ابدأ الآن
                <span className="text-2xl group-hover:translate-x-[-8px] transition-transform">←</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الهيدر الرئيسي مع العداد */}
      <div className="relative bg-gradient-to-r from-[#A31D22] via-[#C1272D] to-[#A31D22] text-white overflow-hidden py-8 px-4 border-b-4 border-yellow-500/20 shadow-xl">
        <div className="container max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right space-y-3 flex-1">
            <div className="inline-block px-3 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] border border-white/5 opacity-80 mb-1">
              بِسمِ اللَّهِ الرَّحمَنِ الرَّحِيمِ
            </div>
            <div className="space-y-0">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-md leading-tight">
                جمعية الهلال الأحمر السوداني
              </h1>
              <p className="text-xs md:text-sm font-bold text-yellow-400 opacity-90">
                فرع ولاية الخرطوم — مكتب طوارئ محلية جبل أولياء
              </p>
            </div>
            <div className="relative inline-flex flex-col items-center md:items-start group">
              <h4 className="text-lg md:text-xl font-black bg-white/5 px-4 py-2 rounded-xl border-r-4 border-yellow-500 shadow-inner">
                المنصة الرقمية لحصر المتطوعين
              </h4>
              <span className="text-[9px] font-mono tracking-widest text-white/50 mt-1 uppercase">
                Digital Platform for Volunteers
              </span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border border-white/10 shadow-2xl min-w-[300px]">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-bold text-yellow-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
                ينتهي الحصر: 30 مايو 2026
              </span>
              <span className="text-[9px] opacity-50 font-mono uppercase tracking-tighter">Countdown</span>
            </div>
            <div className="flex justify-center items-center gap-3">
              {[
                { label: "يوم", value: timeLeft.days, primary: true },
                { label: "ساعة", value: timeLeft.hours },
                { label: "دقيقة", value: timeLeft.minutes },
                { label: "ثانية", value: timeLeft.seconds },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`
                    ${item.primary ? 'w-14 h-14 md:w-16 md:h-16 bg-white text-[#C1272D] shadow-yellow-500/20' : 'w-10 h-10 md:w-12 md:h-12 bg-white/10 text-white'}
                    rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-lg border border-white/10 relative overflow-hidden
                  `}>
                    {item.primary && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500"></div>}
                    {item.value}
                  </div>
                  <span className={`text-[9px] mt-1 font-bold ${item.primary ? 'text-white' : 'opacity-60'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* روابط الإدارة والمتابعة السريعة */}
      <div className="container max-w-3xl mx-auto px-4 pt-5 flex flex-wrap gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={() => setLocation("/status")} className="border-primary/30 text-primary hover:bg-primary/5">
          مراجعة حالة الطلب
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="text-muted-foreground hover:text-foreground text-xs">دخول الإدارة</Button>
      </div>

      {/* جسم الاستمارة الرئيسي */}
      <div className="container max-w-3xl mx-auto px-4 mt-3">
        <div className="bg-card text-card-foreground rounded-xl shadow-lg border p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* البيانات الأساسية */}
              <section className="space-y-6">
                <div className="border-b pb-2"><h3 className="text-xl font-bold text-primary">البيانات الأساسية</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>الاسم الرباعي كاملاً <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="أدخل الاسم الرباعي كاملاً كما بالوثائق" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الرقم الوطني <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          inputMode="numeric" 
                          placeholder="أدخل الأرقام الوطنية فقط" 
                          dir="ltr" 
                          className="text-right" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))} 
                        />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground mt-1">يرجى إدخال الأرقام فقط (بدون مسافات أو رموز)</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>رقم الهاتف الحالي <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="09xxxxxxxx" dir="ltr" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem><FormLabel>رقم الواتساب (اختياري)</FormLabel><FormControl><Input placeholder="09xxxxxxxx" dir="ltr" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yearOfVolunteering" render={({ field }) => (
                    <FormItem><FormLabel>في أي سنة بدأت التطوع مع الهلال الأحمر؟ <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر سنة الانضمام" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-[250px] overflow-y-auto">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              {/* الصورة الشخصية */}
              <section className="space-y-4">
                <div className="border-b pb-2"><h3 className="text-xl font-bold text-primary">الصورة الشخصية للبطاقة</h3></div>
                <FormField control={form.control} name="photoUrl" render={({ field: { value: _v, ...field } }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">إرفاق صورة شخصية حديثة <span className="text-[11px] font-normal text-muted-foreground">(اختياري)</span></FormLabel>
                    <div className="flex items-start gap-5">
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 bg-muted flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/70 transition-colors" onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}>
                        {isUploadingPhoto ? (
                          <div className="text-center p-1 text-xs text-amber-600 font-bold animate-pulse">جاري الرفع سحابياً...</div>
                        ) : photoPreview ? (
                          <img src={photoPreview} alt="الصورة الشخصية" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <span className="text-[10px]">اضغط لرفع صورة</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <FormControl>
                          <input {...field} ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} value="" disabled={isUploadingPhoto} />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto}>
                          {isUploadingPhoto ? "جاري الحفظ..." : photoPreview ? "تغيير الصورة" : "رفع الصورة الشخصية"}
                        </Button>
                        <div className="space-y-2">
                          <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <strong>إرشادات:</strong> اختيارية وتظهر في بطاقتك الرقمية. يتم حفظها آمنة سحابياً دون التأثير على ذاكرة النظام المحدودة.
                          </p>
                        </div>
                        {photoPreview && !isUploadingPhoto && (
                          <button type="button" className="text-xs text-destructive hover:underline block" onClick={() => { setPhotoPreview(null); form.setValue("photoUrl", ""); }}>حذف الصورة</button>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </section>

              {/* الوحدة التطوعية الديناميكية */}
              <section className="space-y-4">
                <div className="border-b pb-2"><h3 className="text-xl font-bold text-primary">الوحدة التطوعية المحلية</h3></div>
                <FormField control={form.control} name="unitId" render={({ field }) => (
                  <FormItem><FormLabel>تتبع لأي وحدة بمحلية جبل أولياء؟ <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingUnits ? "جاري تحميل الوحدات الحية..." : "اختر الوحدة الميدانية التي تنتمي إليها"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {dbUnits.length > 0 ? (
                          dbUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.name} {u.sector ? `(${u.sector})` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>لا توجد وحدات متوفرة حالياً</SelectItem>
                        )}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </section>

              {/* قسم التدريب TOT والشهادات المعتمده */}
              <section className="space-y-6">
                <div className="border-b pb-2"><h3 className="text-xl font-bold text-primary">السجل التدريبي المعتمد (TOT)</h3></div>
                <FormField control={form.control} name="isTotTrainer" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>هل أنت مدرب إسعافات أولية معتمد بالجمعية؟ <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row gap-6">
                        <div className="flex items-center gap-2"><RadioGroupItem value="true" /><FormLabel className="cursor-pointer">نعم، مدرب معتمد</FormLabel></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="false" /><FormLabel className="cursor-pointer">لا</FormLabel></div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />

                {isTotTrainer === "true" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-primary/5 p-5 rounded-lg border border-primary/15 animate-in fade-in slide-in-from-top-2">
                    <FormField control={form.control} name="totCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                      <FormItem className="col-span-1 md:col-span-2 border-dashed border border-muted/70 p-4 rounded bg-white/50">
                        <FormLabel className="text-muted-foreground">إرفاق شهادة مدرب إسعافات أولية (TOT)</FormLabel>
                        <FormControl><input type="file" ref={totCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleTotCertUpload} disabled={isUploadingTot} /></FormControl>
                        <div className="flex items-center gap-3 mt-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => totCertInputRef.current?.click()} disabled={isUploadingTot}>
                            {isUploadingTot ? "جاري الرفع..." : "رفع الشهادة"}
                          </Button>
                          {isUploadingTot ? (
                            <span className="text-xs text-amber-600 font-bold animate-pulse">⏳ جاري الحفظ سحابياً...</span>
                          ) : totCertPreview ? (
                            <span className="text-xs text-green-700 font-bold">✅ تم الرفع والتجهيز</span>
                          ) : null}
                        </div>
                        {totCertPreview && !isUploadingTot && (
                          <button type="button" className="text-xs text-destructive hover:underline mt-1 block" onClick={() => { setTotCertPreview(null); form.setValue("totCertificateUrl", ""); }}>حذف المرفق</button>
                        )}
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="totYear" render={({ field }) => (
                      <FormItem>
                        <FormLabel>سنة الحصول على اعتماد الـ TOT</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر السنة" /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-[200px] overflow-y-auto">{years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastFirstAidRefresher" render={({ field }) => (
                      <FormItem><FormLabel>تاريخ آخر دورة تنشيطية/إنعاشية</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                    
                    <FormField control={form.control} name="otherPrograms" render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2 pt-2 border-t mt-2">
                          <FormLabel className="font-bold text-primary">هل أنت مدرب معتمد في برامج تخصصية أخرى؟</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر البرنامج الإضافي إن وجد" /></SelectTrigger></FormControl>
                            <SelectContent>{OTHER_PROGRAMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                    )} />

                    {otherPrograms && otherPrograms !== "لا" && (
                      <FormField control={form.control} name="otherCertificateUrl" render={({ field: { value: _v, ...field } }) => (
                          <FormItem className="col-span-1 md:col-span-2 bg-white p-4 rounded-lg border-2 border-red-600 animate-in zoom-in-95 shadow-sm">
                            <FormLabel className="text-red-700 font-bold flex items-center gap-2 text-base">رفع شهادة تخصص للبرنامج ({otherPrograms}) <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <input type="file" ref={otherCertInputRef} className="hidden" accept="image/*,.pdf" onChange={handleOtherCertUpload} disabled={isUploadingOther} />
                                <div className="flex items-center gap-3 mt-2">
                                  <Button type="button" variant="destructive" size="sm" onClick={() => otherCertInputRef.current?.click()} className="bg-red-600" disabled={isUploadingOther}>
                                    {isUploadingOther ? "جاري الرفع..." : "اختيار الملف"}
                                  </Button>
                                  {isUploadingOther ? (
                                    <span className="text-xs text-amber-600 font-bold animate-pulse">⏳ جاري الحفظ سحابياً...</span>
                                  ) : otherCertPreview ? (
                                    <span className="text-xs text-green-700 font-bold">✅ تم الرفع بنجاح</span>
                                  ) : null}
                                </div>
                              </div>
                            </FormControl>
                            {otherCertPreview && !isUploadingOther && (
                              <button type="button" className="text-xs text-destructive hover:underline mt-1 block" onClick={() => { setOtherCertPreview(null); form.setValue("otherCertificateUrl", ""); }}>حذف الشهادة التخصصية</button>
                            )}
                            <FormMessage />
                          </FormItem>
                      )} />
                    )}
                  </div>
                )}
              </section>

              {/* الموقع والتوافر */}
              <section className="space-y-6">
                <div className="border-b pb-2"><h3 className="text-xl font-bold text-primary">الوضع الميداني والتوافر الحركي</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="currentStatusInKhartoum" render={({ field }) => (
                    <FormItem><FormLabel>الوضع الجغرافي الحالي بالخرطوم <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر وضعك الحالي" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="موجود حالياً">موجود حالياً داخل الولاية</SelectItem>
                          <SelectItem value="خارج الخرطوم">نزوح/تواجد خارج الولاية</SelectItem>
                          <SelectItem value="مسافر خارج البلاد">خارج السودان حالياً</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  {currentStatusInKhartoum && currentStatusInKhartoum !== "موجود حالياً" && (
                    <FormField control={form.control} name="expectedReturnTime" render={({ field }) => (
                      <FormItem><FormLabel>الزمن المتوقع للعودة للمحلية للمشاركة في العمل</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر المدة المتوقعة" /></SelectTrigger></FormControl>
                          <SelectContent>{["بعد شهر","بعد شهرين","بعد 3 أشهر","بعد 4 أشهر","بعد 5 أشهر","بعد 6 أشهر","بعد سنة","غير محدد"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormField control={form.control} name="availabilityLevel" render={({ field }) => (
                    <FormItem><FormLabel>مدى الجاهزية والتوافر لتلبية النداءات الطارئة والميدانية؟ <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر مستوى توافرك" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="متاح بالكامل">متاح بالكامل (تفرغ تام للطوارئ)</SelectItem>
                          <SelectItem value="متاح جزئياً">متاح جزئياً (حسب جدول الطوارئ والمناوبات)</SelectItem>
                          <SelectItem value="غير متاح حالياً">غير متاح في الوقت الراهن لأسباب قاهرة</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              {/* الالتزام القانوني واللوائح الداخيلية */}
              <section className="space-y-4">
                <div className="border-b pb-2"><h3 className="text-xl font-bold text-primary">المصادقة والالتزام المؤسسي</h3></div>
                <div className="bg-primary/5 border border-primary/20 p-5 rounded-lg space-y-4">
                  <a href="/volunteer-manual.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold flex items-center gap-2 text-sm md:text-base">
                    اضغط هنا للإطلاع على دليل تنمية المتطوعين المعتمد بجمعية الهلال الأحمر السوداني (PDF)
                  </a>
                  <FormField control={form.control} name="agreedToTerms" render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1" /></FormControl>
                      <div><FormLabel className="font-medium cursor-pointer text-sm md:text-base leading-relaxed">أقر وأوافق تماماً على جميع الضوابط، الالتزامات القانونية، والقيم الأساسية الواردة بدليل تنمية المتطوعين لجمعية الهلال الأحمر السوداني. <span className="text-destructive">*</span></FormLabel></div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              {/* زر الإرسال النهائي المحمي بالوقت وبحالة الـ Submission والـ Cloudinary Uploads */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg h-14 bg-gradient-to-r from-[#A31D22] to-[#C1272D] hover:from-[#C1272D] hover:to-[#8B1519]" 
                  disabled={form.formState.isSubmitting || timeLeft.ended || isUploadingPhoto || isUploadingTot || isUploadingOther}
                >
                  {timeLeft.ended 
                    ? "انتهى زمن الحصر والتسجيل الرسمي" 
                    : (isUploadingPhoto || isUploadingTot || isUploadingOther)
                      ? "يرجى الانتظار حتى اكتمال رفع الملفات سحابياً..."
                      : form.formState.isSubmitting 
                        ? "جاري مراجعة وحفظ البيانات برمجياً..." 
                        : "تسجيل واعتماد البيانات الرقمية"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* الفوتر التاريخي */}
      <footer className="mt-12 pb-10 text-center border-t border-gray-100 pt-8">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center">
            <p className="text-gray-500 text-xs md:text-sm font-medium">جميع الحقوق محفوظة لدى <span className="text-[#C1272D] font-bold mx-1">جمعية الهلال الأحمر السوداني</span> &copy; 2026</p>
            <p className="text-[11px] text-gray-500 font-bold mt-1">مكتب طوارئ محلية جبل أولياء</p>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2">
            <div dir="ltr" className="flex items-center justify-center gap-1.5 text-[10px] md:text-xs text-gray-400 font-medium">
              <span>Developed with</span><span className="inline-block text-[#C1272D]">❤️</span><span>by</span><span className="text-gray-800 font-black tracking-tight">Loai & Hazim</span>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-1 rounded-full border border-gray-100 mt-2">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Digital Transformation Unit</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
