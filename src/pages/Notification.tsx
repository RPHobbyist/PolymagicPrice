/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    CheckCircle2, 
    XCircle, 
    Info, 
    Clock, 
    Trash2, 
    Eye,
    AlertTriangle, 
    History as HistoryIcon,
    BellOff,
    ClipboardList,
    ShieldCheck,
    Search,
    CheckCheck,
    X
} from "lucide-react";
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification as NotificationType, NotificationStatus } from "@/types/notifications";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getMachines, saveMachine } from "@/lib/core/sessionStorage";

// Native JS helpers for date grouping
const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return formatDate(date);
};

const groupNotifications = (notifs: NotificationType[]) => {
    const groups: { [key: string]: NotificationType[] } = {
        'Today': [],
        'Yesterday': [],
        'Older': []
    };

    notifs.forEach(n => {
        const date = new Date(n.timestamp);
        if (isToday(date)) {
            groups['Today'].push(n);
        } else if (isYesterday(date)) {
            groups['Yesterday'].push(n);
        } else {
            groups['Older'].push(n);
        }
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
};

const Notification = () => {
    useDocumentSEO({
        title: "Notifications — 3D Print Shop Alerts & Monitoring",
        description: "Real-time monitoring dashboard for your 3D printing workshop. Track inventory alerts, maintenance schedules, production delays, and AI-powered insights.",
        canonical: "/notification",
        ogTitle: "3D Print Shop Alerts & System Monitoring | PolymagicPrice",
        ogDescription: "Stay on top of your 3D printing production. Monitor machine status, low-stock alerts, and production delays in real-time."
    });

    const { notifications, updateStatus, deleteNotification, clearAll, unreadCount } = useNotifications();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => 
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            n.message.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [notifications, searchQuery]);

    const stats = useMemo(() => {
        const todayCount = notifications.filter(n => isToday(new Date(n.timestamp))).length;
        const resolvedCount = notifications.filter(n => n.status === 'ATTENDED' || n.status === 'CANCELLED').length;
        const total = notifications.length;
        const healthPercent = total > 0 ? Math.round((resolvedCount / total) * 100) : 100;

        return {
            new: notifications.filter(n => n.status === 'NEW').length,
            today: todayCount,
            health: healthPercent,
            total: total,
            inProgress: notifications.filter(n => n.status === 'ATTENDED').length,
        };
    }, [notifications]);

    const handleMarkAllRead = useCallback(() => {
        notifications
            .filter(n => n.status === 'NEW')
            .forEach(n => updateStatus(n.id, 'ATTENDED'));
    }, [notifications, updateStatus]);

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-900 animate-fade-in flex flex-col">
            <PageHeader 
                title="Notification" 
                subtitle="Real-Time System Intelligence & Alert Governance"
                actions={null}
            />

            <main className="container mx-auto px-6 py-8 max-w-[1600px] space-y-10">
                {/* Dashboard Summary */}
                <section className="animate-fade-in stagger-1">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Operation Awareness Summary</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard 
                            title="Active Alerts"
                            value={stats.new}
                            subtitle="Pending attention"
                            icon={AlertTriangle}
                        />
                        <StatsCard 
                            title="Recent Activity"
                            value={stats.today}
                            subtitle="Logged today"
                            icon={ClipboardList}
                        />
                        <StatsCard 
                            title="System Health"
                            value={`${stats.health}%`}
                            subtitle="Resolution rate"
                            icon={ShieldCheck}
                        />
                        <StatsCard 
                            title="Total Logged"
                            value={stats.total}
                            subtitle="Full history"
                            icon={HistoryIcon}
                        />
                    </div>
                </section>

                {/* Filter & Search Bar */}
                <section className="animate-fade-in stagger-2">
                    <div className="relative group max-w-2xl">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <Input 
                            type="text"
                            placeholder="Search repository: Filter alerts by project, material, or system event..."
                            className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-none text-[10px] font-semibold uppercase tracking-widest shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search notifications by project, material, or system event"
                        />
                    </div>
                </section>

                {/* Main Content Area with Tabs */}
                <section className="animate-fade-in stagger-3">
                    <Tabs defaultValue="pending" className="w-full space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200/60 pb-4">
                            <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-none h-10 w-fit">
                                <TabsTrigger 
                                    value="pending" 
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-semibold uppercase tracking-tight h-8 px-4 rounded-none"
                                >
                                    Pending {stats.new > 0 && `(${stats.new})`}
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="active" 
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-semibold uppercase tracking-tight h-8 px-4 rounded-none"
                                >
                                    Attended
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="history" 
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-semibold uppercase tracking-tight h-8 px-4 rounded-none"
                                >
                                    History
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 text-[10px] font-semibold uppercase tracking-wider border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm"
                                        onClick={handleMarkAllRead}
                                    >
                                        <CheckCheck className="w-3.5 h-3.5 mr-2" />
                                        Mark All as Read
                                    </Button>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 text-[10px] font-semibold uppercase tracking-wider border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                                    onClick={clearAll}
                                    disabled={notifications.length === 0}
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Purge Records
                                </Button>
                            </div>
                        </div>

                        <TabsContent value="pending" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <NotificationList 
                                items={filteredNotifications.filter(n => n.status === 'NEW')} 
                                updateStatus={updateStatus}
                                deleteNotification={deleteNotification}
                                navigate={navigate}
                            />
                        </TabsContent>
                        <TabsContent value="active" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <NotificationList 
                                items={filteredNotifications.filter(n => n.status === 'ATTENDED')} 
                                updateStatus={updateStatus}
                                deleteNotification={deleteNotification}
                                navigate={navigate}
                            />
                        </TabsContent>
                        <TabsContent value="history" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <NotificationList 
                                items={filteredNotifications.filter(n => n.status === 'REJECTED' || n.status === 'CANCELLED')} 
                                updateStatus={updateStatus}
                                deleteNotification={deleteNotification}
                                navigate={navigate}
                            />
                        </TabsContent>
                    </Tabs>
                </section>
            </main>
        </div>
    );
};

// Helper Components relocated for organizational clarity and performance
const getIcon = (type: string) => {
    const iconClass = "w-6 h-6";
    switch (type) {
        case 'SUCCESS': return <CheckCircle2 className={cn(iconClass, "text-emerald-500")} />;
        case 'WARNING': return <AlertTriangle className={cn(iconClass, "text-amber-500")} />;
        case 'ERROR': return <XCircle className={cn(iconClass, "text-destructive")} />;
        default: return <Info className={cn(iconClass, "text-blue-500")} />;
    }
};

const NotificationItem = ({ item, updateStatus, deleteNotification, navigate }: { 
    item: NotificationType,
    updateStatus: (id: string, status: NotificationStatus) => void,
    deleteNotification: (id: string) => void,
    navigate: (path: string) => void
}) => {
    const metadata = item.metadata as Record<string, unknown> | undefined;
    const machineId = metadata?.machineId as string | undefined;
    const type = metadata?.type as string | undefined;

    return (
    <Card className={cn(
        "group relative flex items-start gap-4 p-4 transition-all duration-300 border-border/50 hover:border-border hover:shadow-subtle rounded-none",
        item.status === 'NEW' ? "bg-white shadow-sm ring-1 ring-primary/5" : "bg-white/50"
    )}>

        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center">
            {getIcon(item.type)}
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <h3 className={cn(
                    "text-sm font-semibold tracking-tight truncate",
                    item.status === 'NEW' ? "text-slate-900" : "text-slate-600"
                )}>
                    {item.title}
                </h3>
                <div className="flex items-center gap-3">
                    <time className="shrink-0 text-[10px] font-normal text-slate-600 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(new Date(item.timestamp))}
                    </time>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-slate-300 hover:text-destructive hover:bg-transparent -mr-2"
                        onClick={() => deleteNotification(item.id)}
                        title="Close notification"
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
            
            <p className={cn(
                "text-xs leading-relaxed font-normal",
                item.status === 'NEW' ? "text-slate-600" : "text-slate-400"
            )}>
                {item.message}
            </p>

            <div className="flex items-center gap-2 pt-2 transition-opacity">
                {item.status === 'NEW' && (
                    <>
                        {type === 'DELAY' && item.source === 'SYSTEM' && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-7 px-3 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 border-none"
                                onClick={() => {
                                    navigate('/order-manager');
                                    updateStatus(item.id, 'ATTENDED');
                                }}
                            >
                                Investigate Delay
                            </Button>
                        )}
                        {type === 'MAINTENANCE' && item.source === 'SYSTEM' && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-7 px-3 text-[10px] font-bold bg-destructive hover:bg-destructive/90 border-none"
                                onClick={() => {
                                    const machines = getMachines();
                                    const machine = machines.find(m => m.id === machineId);
                                    if (machine) {
                                        saveMachine({
                                            ...machine,
                                            lastMaintenanceHours: machine.totalRuntimeHours,
                                            lastMaintenanceDate: new Date().toISOString()
                                        });
                                    }
                                    updateStatus(item.id, 'ATTENDED');
                                }}
                            >
                                Log Maintenance
                            </Button>
                        )}
                        {type === 'PROCUREMENT' && item.source === 'SYSTEM' && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-7 px-3 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 border-none"
                                onClick={() => {
                                    navigate('/settings?tab=materials');
                                    updateStatus(item.id, 'ATTENDED');
                                }}
                            >
                                Restock Now
                            </Button>
                        )}
                        
                        {(item.source === 'AI' || !type) && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-7 px-3 text-[10px] font-bold"
                                onClick={() => updateStatus(item.id, 'ATTENDED')}
                            >
                                <Eye className="w-3 h-3 mr-1.5" />
                                {item.source === 'AI' ? 'Read Insight' : 'Attend Alert'}
                            </Button>
                        )}
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-3 text-[10px] font-bold"
                            onClick={() => updateStatus(item.id, 'REJECTED')}
                        >
                            Dismiss
                        </Button>
                    </>
                )}
                {item.status === 'ATTENDED' && (
                    <div className="flex items-center gap-2">
                        <Badge variant="success">
                            <CheckCheck className="w-3 h-3 mr-1" /> Attended
                        </Badge>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold text-slate-600 hover:text-slate-900"
                            onClick={() => updateStatus(item.id, 'CANCELLED')}
                        >
                            Complete
                        </Button>
                    </div>
                )}
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-slate-300 hover:text-destructive ml-auto"
                    onClick={() => deleteNotification(item.id)}
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>
        </div>
    </Card>
    );
};

const NotificationList = ({ items, updateStatus, deleteNotification, navigate }: { 
    items: NotificationType[],
    updateStatus: (id: string, status: NotificationStatus) => void,
    deleteNotification: (id: string) => void,
    navigate: (path: string) => void
}) => {
    const groups = groupNotifications(items);
    
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-none bg-white/30 backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-center">
                <BellOff className="h-10 w-10 text-slate-300" />
            </div>
                <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest mb-1">System Nominal</h3>
                <p className="text-xs text-slate-600 max-w-[280px] leading-relaxed font-normal uppercase tracking-tight">
                    No active monitoring alerts in this sector. 
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-10 relative">
            {groups.map(([title, groupItems]) => (
                <div key={title} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wider min-w-fit">{title}</h3>
                        <div className="h-px w-full bg-slate-200" />
                    </div>
                    <div className="grid gap-3">
                        {groupItems.map(item => (
                            <NotificationItem 
                                key={item.id} 
                                item={item} 
                                updateStatus={updateStatus} 
                                deleteNotification={deleteNotification}
                                navigate={navigate}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Notification;
