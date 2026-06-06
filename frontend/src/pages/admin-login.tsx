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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// الرابط المباشر الصحيح لسيرفر ريندر المركزي
const API_URL = "https://volunteer-system-v3.onrender.com/api";

const loginSchema = z.object({
  username: z.string().min(1, "يجب إدخال اسم المستخدم"),
  password: z.string().min(1, "يجب إدخال كلمة المرور"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👁️ حالة التحكم في إظهار وإخفاء كلمة المرور

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsPending(true);

    try {
      // الاتصال بمسار الـ Auth الموحد والمحدث في الباك إند
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // حاسمة جداً عشان المتصفح يستقبل الـ Cookie الخاصة بالـ Session ويحفظها
        body: JSON.stringify(data),
      });

      // فحص أمان: للتأكد من أن السيرفر رد بـ JSON وليس خطأ سحابي معلق
      let result: any = {};
      try {
        result = await response.json();
      } catch (e) {
        result = { error: "السيرفر لم يرسل استجابة صالحة (قد يكون قيد التشغيل، أعد المحاولة بعد ثوانٍ)" };
      }

      if (response.ok) {
        // حفظ بيانات المشرف ورتبته وصلاحياته القادمة من السيرفر في ذاكرة المتصفح
        if (result && result.user) {
          localStorage.setItem("admin_user", JSON.stringify(result.user));
        } else if (result) {
          // احتياطاً إذا كان السيرفر يرسل الكائن مباشرة بدون تغليفه في user
          localStorage.setItem("admin_user", JSON.stringify(result));
        }

        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `مرحباً بك مجدداً يا قائد!`,
        });

        setLocation("/admin/dashboard");
      } else {
        throw new Error(result.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: err.message,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center text-white mb-4">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-10 h-10">
              <path d="M50 0A50 50 0 1 0 100 50 35 35 0 1 1 50 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم الإدارية</h1>
          <p className="text-muted-foreground text-sm">نظام حصر وتوثيق متطوعي الهلال الأحمر</p>
        </div>

        <div className="bg-card text-card-foreground p-8 rounded-xl shadow-lg border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم المستخدم" dir="ltr" className="text-right" data-testid="input-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      {/* حاوية نسبية لتثبيت الأيقونة بدقة على اليسار لعدم حجب النص العربي البادئ من اليمين */}
                      <div className="relative flex items-center">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="أدخل كلمة المرور" 
                          dir="ltr" 
                          className="text-right pl-10" 
                          data-testid="input-password" 
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isPending}
                data-testid="button-login"
              >
                {isPending ? "جاري التحقق والدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setLocation("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            العودة للاستمارة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
