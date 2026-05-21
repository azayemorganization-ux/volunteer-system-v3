import { useEffect, useRef, useState } from "react";
// استيراد الجسر الموحد المحدث وتحديث المسارات لتبسيط العمليات
import { fetchVolunteers, fetchUnits, fetchSubAdmins, fetchStats } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { IDCard, CardScreenshotPopup, type VolunteerCardData } from "./success"; 
import { FileSpreadsheet, Download, Users, ShieldCheck } from "lucide-react";

// استخدام المتغير الديناميكي لرابط الـ API المتصل بـ Render أو المحلي لعمليات الـ Auth المباشرة
const API_URL = process.env.NODE_ENV === "production" 
  ? "https://your-backend-url.onrender.com/api" 
  : "http://localhost:5000/api";

// ─── helpers ────────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  "الاسم غير صحيح",
  "الرقم الوطني غير صحيح",
  "الصورة الشخصية غير واضحة أو غير مقبولة",
  "شهادة TOT غير صحيحة أو غير واضحة",
  "سبب آخر",
];

function volunteerToCardData(v: any): VolunteerCardData {
  return {
    id: v.id,
    volunteerId: v.volunteerId,
    fullName: v.fullName,
    phone: v.phone,
    unitName: v.unitName ?? null,
    photoUrl: v.photoUrl ?? null,
    status: v.status,
    approvedAt: v.approvedAt ?? null,
    approvedBy: v.approvedBy ?? null,
    createdAt: v.createdAt,
  };
}

// ─── Root component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [admin, setAdmin] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    // التحقق من هوية المشرف باستخدام الجلسة الآمنة والكوكيز المشفرة
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setAdmin)
      .catch(() => setLocation("/admin"))
      .finally(() => setAdminLoading(false));
  }, [setLocation]);

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    setLocation("/admin");
  };

  if (adminLoading) {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl"><div className="text-muted-foreground">جاري التحميل وتأمين الجلسة...</div></div>;
  }
  if (!admin) return null;
  const isSuperadmin = admin.role === "superadmin";

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold hidden sm:block">لوحة التحكم الإدارية</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">مرحباً،</span>{" "}
              <span className="font-semibold">{admin.displayName || admin.username}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${isSuperadmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {isSuperadmin ? "مسؤول رئيسي" : "مشرف قطاع"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>تسجيل الخروج</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="bg-white border shadow-sm p-1">
            <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
            <TabsTrigger value="pending">الطلبات المعلقة</TabsTrigger>
            <TabsTrigger value="directory">دليل المتطوعين</TabsTrigger>
            {isSuperadmin && <TabsTrigger value="units">إدارة الوحدات</TabsTrigger>}
            {isSuperadmin && <TabsTrigger value="admins">إدارة المشرفين</TabsTrigger>}
          </TabsList>

          <TabsContent value="stats"><StatsTab /></TabsContent>
          <TabsContent value="pending"><PendingTab isSuperadmin={isSuperadmin} /></TabsContent>
          <TabsContent value="directory"><DirectoryTab isSuperadmin={isSuperadmin} /></TabsContent>
          {isSuperadmin && <TabsContent value="units"><UnitsTab /></TabsContent>}
          {isSuperadmin && <TabsContent value="admins"><AdminsTab /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

// ─── Stats Tab ───────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = () => {
    setIsLoading(true);
    fetchStats() // استخدام الدالة الآمنة من جسر الـ API
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return <div className="py-12 text-center">جاري تحميل الإحصائيات...</div>;
  }

  return (
    <div className="space-y-6">
      {stats.pending > 0 && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 shadow-sm">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-bold text-amber-900 text-base">
              يوجد {stats.pending} طلب{stats.pending > 1 ? "ات" : ""} في انتظار الاعتماد
            </div>
            <div className="text-amber-700 text-sm">يرجى مراجعة تبويب "الطلبات المعلقة" للاعتماد أو الرفض</div>
          </div>
          <span className="bg-amber-500 text-white text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center shrink-0">
            {stats.pending}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold text-primary">{stats.total}</CardTitle>
            <CardDescription>إجمالي المتطوعين</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold text-green-600">{stats.approved}</CardTitle>
            <CardDescription>معتمدون</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold text-amber-500">{stats.pending}</CardTitle>
            <CardDescription>قيد الانتظار</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold text-red-500">{stats.rejected ?? 0}</CardTitle>
            <CardDescription>مرفوضون</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

// ─── Shared Profile Dialog ────────────────────────────────────────────────────

function ProfileDialog({ volunteer, open, onClose, isSuperadmin, onRefresh }: {
  volunteer: any | null;
  open: boolean;
  onClose: () => void;
  isSuperadmin: boolean;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showCard, setShowCard] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  if (!volunteer) return null;
  const cardData = volunteerToCardData(volunteer);

  const handleApprove = async () => {
    setIsActionPending(true);
    try {
      const res = await fetch(`${API_URL}/volunteers/${volunteer.id}/approve`, { 
        method: "POST",
        credentials: "include" 
      });
      if (res.ok) {
        toast({ title: "تم اعتماد المتطوع بنجاح وتوليد الرقم التعريفي" });
        onRefresh();
        onClose();
      } else {
        throw new Error();
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل اعتماد طلب المتطوع" });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectReason === "سبب آخر" ? (customReason.trim() || "سبب آخر") : rejectReason;
    setIsActionPending(true);
    try {
      const res = await fetch(`${API_URL}/volunteers/${volunteer.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        toast({ title: "تم رفض الطلب وإرسال السبب" });
        setShowRejectDialog(false);
        onRefresh();
        onClose();
      } else {
        throw new Error();
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل تنفيذ عملية الرفض" });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد نهائياً من حذف سجل "${volunteer.fullName}"؟`)) return;
    setIsActionPending(true);
    try {
      const res = await fetch(`${API_URL}/volunteers/${volunteer.id}`, { 
        method: "DELETE",
        credentials: "include" 
      });
      if (res.ok) {
        toast({ title: "تم حذف السجل من قاعدة البيانات بنجاح" });
        onRefresh();
        onClose();
      } else {
        throw new Error();
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل عملية حذف السجل" });
    } finally {
      setIsActionPending(false);
    }
  };

  const detailRows = [
    ["الوحدة", volunteer.unitName || "—"],
    ["القطاع", volunteer.sectorName || "—"],
    ["الواتساب", volunteer.whatsapp || "—"],
    ["الرقم الوطني", volunteer.nationalId],
    ["سنة التطوع", volunteer.yearOfVolunteering],
    ["الوضع الحالي", volunteer.currentStatusInKhartoum],
    ["التوافر", volunteer.availabilityLevel],
    ["وقت العودة", volunteer.expectedReturnTime || "—"],
    ["مدرب إسعافات", volunteer.isTotTrainer ? "نعم" : "لا"],
    ["سنة TOT", volunteer.totYear || "—"],
    ["آخر منعش", volunteer.lastFirstAidRefresher || "—"],
    ["برامج أخرى", volunteer.otherPrograms || "—"],
    ["تاريخ التسجيل", volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString("ar-EG") : "—"],
    ["تاريخ الاعتماد", volunteer.approvedAt ? new Date(volunteer.approvedAt).toLocaleDateString("ar-EG") : "—"],
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 overflow-hidden" dir="rtl">
          <div className="flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="bg-primary/5 border-b px-6 py-4 flex items-center gap-4">
              {volunteer.photoUrl ? (
                <img src={volunteer.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xl truncate">{volunteer.fullName}</div>
                <div className="font-mono text-primary text-sm" dir="ltr">{volunteer.volunteerId || "قيد التوليد..."}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${volunteer.status === "approved" ? "bg-green-100 text-green-800" : volunteer.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                    {volunteer.status === "approved" ? "معتمد" : volunteer.status === "rejected" ? "مرفوض" : "قيد الانتظار"}
                  </span>
                  {(volunteer.status === "approved" || volunteer.status === "rejected") && volunteer.approvedBy && (
                    <span className="text-xs text-muted-foreground mr-2 font-medium">
                      {volunteer.status === "approved" ? "(اعتمده: " : "(رفضه: " }
                      <span className="text-primary">{volunteer.approvedBy}</span>)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4 text-sm border-b">
              {detailRows.map(([label, val]) => (
                <div key={label}>
                  <div className="text-muted-foreground text-xs mb-0.5">{label}</div>
                  <div className="font-semibold">{val}</div>
                </div>
              ))}

              {volunteer.status === "rejected" && volunteer.rejectionReason && (
                <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-xs text-red-600 mb-0.5">سبب الرفض</div>
                  <div className="font-semibold text-red-800">{volunteer.rejectionReason}</div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 flex flex-col gap-2">
              <div className="flex gap-2">
                {volunteer.totCertificateUrl && (
                  <button 
                    onClick={() => {
                      const el = document.getElementById('tot-img');
                      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                    }}
                    className="bg-red-600 text-white p-2 rounded text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                  >
                    عرض صورة TOT
                  </button>
                )}
                {volunteer.otherCertificateUrl && (
                  <button 
                    onClick={() => {
                      const el = document.getElementById('other-img');
                      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                    }}
                    className="bg-red-600 text-white p-2 rounded text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                  >
                    الشهادة الإضافية
                  </button>
                )}
              </div>
              {volunteer.totCertificateUrl && (
                <img id="tot-img" src={volunteer.totCertificateUrl} style={{display: 'none', width: '100%', marginTop: '10px', borderRadius: '8px'}} />
              )}
              {volunteer.otherCertificateUrl && (
                <img id="other-img" src={volunteer.otherCertificateUrl} style={{display: 'none', width: '100%', marginTop: '10px', borderRadius: '8px'}} />
              )}
            </div>

            <div className="px-6 py-5 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-3 font-medium">بطاقة المتطوع الرقمية</div>
              <div className="overflow-x-auto pb-1">
                <div className="mx-auto w-full max-w-[340px]">
                  <IDCard volunteer={cardData} />
                </div>
              </div>
              {volunteer.status === "approved" && (
                <div className="mt-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => setShowCard(true)} className="gap-2">
                    عرض البطاقة للحفظ
                  </Button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-white flex flex-wrap gap-2 justify-end">
              {volunteer.status === "pending" && (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={handleApprove} disabled={isActionPending}>اعتماد الطلب</Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)} disabled={isActionPending} className="gap-1">رفض الطلب</Button>
                </>
              )}
              {volunteer.status === "rejected" && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={handleApprove} disabled={isActionPending}>اعتماد بعد المراجعة</Button>
              )}
              {isSuperadmin && (
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleDelete} disabled={isActionPending}>حذف السجل نهائياً</Button>
              )}
              <Button size="sm" variant="ghost" onClick={onClose}>إغلاق</Button>    
            </div> 
          </div> 
        </DialogContent>
      </Dialog>

      {volunteer.status === "approved" && (
        <CardScreenshotPopup volunteer={cardData} open={showCard} onClose={() => setShowCard(false)} />
      )}

      <Dialog open={showRejectDialog} onOpenChange={(o) => !o && setShowRejectDialog(false)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>اختر سبب الرفض</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {REJECTION_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setRejectReason(reason)}
                className={`w-full text-right px-4 py-3 rounded-lg border text-sm transition-colors ${rejectReason === reason ? "border-destructive bg-destructive/5 text-destructive font-semibold" : "border-border hover:bg-muted"}`}
              >
                {reason}
              </button>
            ))}
            {rejectReason === "سبب آخر" && (
              <Input placeholder="اكتب السبب..." value={customReason} onChange={(e) => setCustomReason(e.target.value)} className="mt-2" />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="destructive" onClick={handleReject} disabled={isActionPending || (rejectReason === "سبب آخر" && !customReason.trim())}>تأكيد الرفض</Button>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Pending Tab ──────────────────────────────────────────────────────────────

function PendingTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<any | null>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  const loadPendingData = () => {
    setIsLoading(true);
    fetchVolunteers({ status: "pending" })
      .then(setVolunteers)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPendingData();
  }, []);

  const handleApprove = async (v: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/volunteers/${v.id}/approve`, { 
        method: "POST",
        credentials: "include" 
      });
      if (res.ok) {
        toast({ title: "تم الاعتماد بنجاح" });
        loadPendingData();
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل اعتماد المتطوع" });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason === "سبب آخر" ? (customReason.trim() || "سبب آخر") : rejectReason;
    try {
      const res = await fetch(`${API_URL}/volunteers/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        toast({ title: "تم الرفض بنجاح" });
        setRejectTarget(null);
        setCustomReason("");
        loadPendingData();
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل تنفيذ عملية الرفض" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>الطلبات المعلقة</CardTitle>
          <CardDescription>اضغط على اسم المتطوع لعرض الملف والشهادات كاملاً</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">جاري تحميل الطلبات المعلقة...</div>
          ) : !volunteers?.length ? (
            <div className="py-16 text-center text-muted-foreground">لا توجد أي طلبات معلقة حالياً في قطاعك</div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الوحدة</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">التوافر</TableHead>
                    <TableHead className="text-center">إجراءات سريعة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers.map((v) => (
                    <TableRow key={v.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(v)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {v.photoUrl && <img src={v.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
                      </TableCell>
                      <TableCell className="font-medium text-primary">{v.fullName}</TableCell>
                      <TableCell>{v.unitName}</TableCell>
                      <TableCell dir="ltr" className="text-right">{v.phone}</TableCell>
                      <TableCell>{v.availabilityLevel}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7" onClick={(e) => handleApprove(v, e)}>اعتماد</Button>
                          <Button size="sm" variant="outline" className="text-destructive h-7" onClick={(e) => { e.stopPropagation(); setRejectTarget(v); }}>رفض</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ProfileDialog volunteer={selected} open={!!selected} onClose={() => setSelected(null)} isSuperadmin={isSuperadmin} onRefresh={loadPendingData} />
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>سبب رفض طلب: {rejectTarget?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            {REJECTION_REASONS.map((reason) => (
              <button key={reason} type="button" onClick={() => setRejectReason(reason)}
                className={`w-full text-right px-4 py-3 rounded-lg border text-sm ${rejectReason === reason ? "border-destructive bg-destructive/5 text-destructive font-semibold" : "border-border"}`}>
                {reason}
              </button>
            ))}
            {rejectReason === "سبب آخر" && <Input placeholder="اكتب السبب..." value={customReason} onChange={(e) => setCustomReason(e.target.value)} />}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="destructive" onClick={handleReject}>تأكيد الرفض</Button>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Directory Tab ────────────────────────────────────────────────────────────

function DirectoryTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [unitFilter, setUnitFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDirectoryData = () => {
    setIsLoading(true);
    fetchVolunteers({
      unitId: unitFilter && unitFilter !== "all" ? unitFilter : undefined,
      search: searchQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    })
    .then(setVolunteers)
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchUnits().then(setUnits);
  }, []);

  useEffect(() => {
    loadDirectoryData();
  }, [unitFilter, searchQuery, statusFilter]);

  const exportToExcel = () => {
    if (!volunteers?.length) return;
    const worksheet = XLSX.utils.json_to_sheet(volunteers.map(v => ({
      "الاسم": v.fullName,
      "الرقم الوطني": v.nationalId,
      "الوحدة": v.unitName,
      "القطاع": v.sectorName || "—",
      "الهاتف": v.phone,
      "الحالة": v.status === "approved" ? "معتمد" : v.status === "rejected" ? "مرفوض" : "قيد الانتظار"
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المتطوعون");
    XLSX.utils.writeFile(workbook, "volunteers_report.xlsx");
  };

  const exportToPDF = () => {
    if (!volunteers?.length) return;
    const doc = new jsPDF();
    (doc as any).autoTable({
      head: [['الاسم', 'الوحدة', 'القطاع', 'الحالة']],
      body: volunteers.map(v => [v.fullName, v.unitName, v.sectorName || "—", v.status]),
      styles: { font: "helvetica", halign: 'right' }
    });
    doc.save("volunteers_report.pdf");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>دليل المتطوعين العام</CardTitle>
              <CardDescription>عرض وتصفية وإدارة كافة السجلات المرفوعة على السيرفر</CardDescription>
            </div>
            {isSuperadmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  تصدير Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                  <Download className="w-4 h-4" />
                  تصدير PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <Input placeholder="البحث بالاسم السداسي أو الرقم الوطني..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="md:w-1/3" />
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="md:w-1/4"><SelectValue placeholder="تصفية بالوحدة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الوحدات الجغرافية</SelectItem>
                {units?.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-1/4"><SelectValue placeholder="تصفية بالحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الوحدة</TableHead>
                  <TableHead className="text-right">القطاع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التوافر</TableHead>
                  <TableHead className="text-right">رقم المتطوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">جاري جلب البيانات من السيرفر...</TableCell></TableRow>
                ) : !volunteers?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد سجلات مطابقة للفلاتر الحالية</TableCell></TableRow>
                ) : (
                  volunteers?.map((v) => (
                    <TableRow key={v.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(v)}>
                      <TableCell>{v.photoUrl && <img src={v.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}</TableCell>
                      <TableCell className="font-medium text-primary">{v.fullName}</TableCell>
                      <TableCell>{v.unitName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{v.sectorName || "—"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === "approved" ? "bg-green-100 text-green-800" : v.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                          {v.status === "approved" ? "معتمد" : v.status === "rejected" ? "مرفوض" : "قيد الانتظار"}
                        </span>
                      </TableCell>
                      <TableCell>{v.availabilityLevel}</TableCell>
                      <TableCell className="font-mono text-sm">{v.volunteerId || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ProfileDialog volunteer={selected} open={!!selected} onClose={() => setSelected(null)} isSuperadmin={isSuperadmin} onRefresh={loadDirectoryData} />
    </>
  );
}

// ─── Units Tab ──────────────────────────────────────────────

function UnitsTab() {
  const { toast } = useToast();
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: "", sector: "" });

  const loadUnitsData = () => {
    setIsLoading(true);
    fetchUnits().then(setUnits).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUnitsData();
  }, []);

  const handleAddUnit = async () => {
    if (!newUnit.name.trim()) return;
    setIsActionPending(true);
    try {
      const res = await fetch(`${API_URL}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newUnit.name.trim(), sector: newUnit.sector.trim() || null })
      });
      if (res.ok) {
        setNewUnit({ name: "", sector: "" });
        loadUnitsData();
        toast({ title: "تم إضافة الوحدة والقطاع بنجاح لخرائط النظام" });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل إضافة الوحدة" });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة الجغرافية نهائياً؟")) return;
    setIsActionPending(true);
    try {
      const res = await fetch(`${API_URL}/units/${id}`, { 
        method: "DELETE",
        credentials: "include" 
      });
      if (res.ok) {
        loadUnitsData();
        toast({ title: "تم حذف الوحدة وتحديث الفلاتر" });
      }
    } catch {
      toast({ variant: "destructive", title: "لا يمكن الحذف", description: "فشل حذف الوحدة لوجود متطوعين مرتبطين بها" });
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة الوحدات والقطاعات الجغرافية</CardTitle>
        <CardDescription>أضف اسم الوحدة والقطاع التابعة له (مثلاً: وحدة الكلاكلة - قطاع جبل أولياء)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 max-w-2xl">
          <Input placeholder="اسم الوحدة..." value={newUnit.name} onChange={(e) => setNewUnit({...newUnit, name: e.target.value})} />
          <Input placeholder="اسم القطاع..." value={newUnit.sector} onChange={(e) => setNewUnit({...newUnit, sector: e.target.value})} />
          <Button onClick={handleAddUnit} disabled={isActionPending || !newUnit.name.trim()}>إضافة وحدة جديدة</Button>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الوحدة الجغرافية</TableHead>
                <TableHead className="text-right">القطاع الإداري</TableHead>
                <TableHead className="text-center w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-4">جاري تحميل خريطة الوحدات...</TableCell></TableRow>
              ) : (
                units?.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {unit.sector || "غير مصنف"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUnit(unit.id)} disabled={isActionPending}>حذف</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Admins Tab ───────────────────────────────────────

function AdminsTab() {
  const { toast } = useToast();
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", role: "subadmin", sector: "" });

  const loadAdminsAndUnits = () => {
    setIsLoading(true);
    Promise.all([fetchSubAdmins(), fetchUnits()])
      .then(([admins, fetchedUnits]) => {
        setSubAdmins(admins);
        setUnits(fetchedUnits);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAdminsAndUnits();
  }, []);

  const uniqueSectors = Array.from(new Set(units?.map(u => u.sector).filter(Boolean)));

  const handleCreate = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "يجب إدخال اسم المستخدم وكلمة المرور لتأمين الحساب" });
      return;
    }

    const sectorUnits = units?.filter(u => u.sector === form.sector).map(u => u.id).join(",") || "";
    setIsActionPending(true);

    try {
      const res = await fetch(`${API_URL}/sub-admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password.trim(),
          displayName: form.displayName.trim() || null,
          role: form.role === "subadmin" ? "subadmin" : "sectoradmin",
          assignedUnits: form.role === "sectoradmin" ? sectorUnits : null
        })
      });

      if (res.ok) {
        setForm({ username: "", password: "", displayName: "", role: "subadmin", sector: "" });
        loadAdminsAndUnits();
        toast({ title: "تم إنشاء حساب المشرف وتخصيص الصلاحيات بنجاح" });
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "فشل إنشاء الحساب");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل إنشاء الحساب" });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDeleteAdmin = async (id: number, username: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب المشرف (${username}) نهائياً؟`)) return;
    try {
      const res = await fetch(`${API_URL}/sub-admins/${id}`, { 
        method: "DELETE",
        credentials: "include" 
      });
      if (res.ok) {
        loadAdminsAndUnits();
        toast({ title: "تم حذف حساب المشرف بنجاح" });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف الحساب" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>إضافة مشرف أو مسؤول قطاع جديد</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <Input placeholder="اسم المستخدم" dir="ltr" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} />
            <Input type="password" placeholder="كلمة المرور" dir="ltr" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
            <Input placeholder="الاسم المعروض" value={form.displayName} onChange={(e) => setForm({...form, displayName: e.target.value})} />
            <Select value={form.role} onValueChange={(val) => setForm({...form, role: val})}>
              <SelectTrigger><SelectValue placeholder="نوع الصلاحية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subadmin">مشرف فرعي (كل الوحدات)</SelectItem>
                <SelectItem value="sectoradmin">مشرف قطاع جرافي مخصص</SelectItem>
              </SelectContent>
            </Select>
            {form.role === "sectoradmin" && (
              <Select value={form.sector} onValueChange={(val) => setForm({...form, sector: val})}>
                <SelectTrigger><SelectValue placeholder="اختر القطاع" /></SelectTrigger>
                <SelectContent>
                  {uniqueSectors.map(s => <SelectItem key={s as string} value={s as string}>{s as string}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={handleCreate} disabled={isActionPending}>حفظ وإنشاء الحساب</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قائمة الحسابات النشطة للمشرفين</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم المعروض</TableHead>
                  <TableHead className="text-right">اسم المستخدم</TableHead>
                  <TableHead className="text-right">نوع الصلاحية</TableHead>
                  <TableHead className="text-center w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4">جاري تحميل قائمة المشرفين...</TableCell></TableRow>
                ) : subAdmins?.map((sa) => (
                  <TableRow key={sa.id}>
                    <TableCell className="font-medium">{sa.displayName || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{sa.username}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${sa.role === "superadmin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {sa.role === "superadmin" ? "مسؤول رئيسي" : sa.role === "sectoradmin" ? "مشرف قطاع مخصص" : "مشرف فرعي عام"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {sa.role !== "superadmin" ? (
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAdmin(sa.id, sa.username)}>حذف</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">حساب محمي</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
