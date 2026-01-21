
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface LogEntry {
    id: number;
    user_id: string | null;
    created_at: string;
    level: string;
    module: string;
    message: string;
}

const Logs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [levelFilter, setLevelFilter] = useState<string>("ALL");

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("logs")
                .select("id, user_id, created_at, level, module, message")
                .order("created_at", { ascending: false })
                .limit(100);

            if (levelFilter !== "ALL") {
                query = query.eq("level", levelFilter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [levelFilter]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case "ERROR":
                return "destructive";
            case "WARNING":
                return "warning"; // Need to ensure warning variant exists or use default
            case "INFO":
                return "secondary";
            default:
                return "outline";
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
                        <p className="text-muted-foreground mt-2">
                            Live logs from your bot on VPS.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Levels</SelectItem>
                                <SelectItem value="INFO">Info</SelectItem>
                                <SelectItem value="WARNING">Warning</SelectItem>
                                <SelectItem value="ERROR">Error</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchLogs}>
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                <Card className="h-[600px] flex flex-col">
                    <CardHeader className="py-3 px-4 border-b">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="w-20">Time</span>
                            <span className="w-16">Level</span>
                            <span className="w-24">Module</span>
                            <span>Message</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="flex flex-col div-y">
                                {logs.length === 0 && !loading ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No logs found. Is the bot running?
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-2 py-2 px-4 hover:bg-muted/50 border-b last:border-0 text-sm font-mono"
                                        >
                                            <span className="text-muted-foreground w-20 shrink-0 text-xs mt-1">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </span>
                                            <div className="w-16 shrink-0">
                                                <Badge variant={log.level === 'ERROR' ? 'destructive' : 'secondary'} className="text-[10px] px-1 h-5">
                                                    {log.level}
                                                </Badge>
                                            </div>
                                            <span className="text-blue-400 w-24 shrink-0 truncate font-semibold" title={log.module}>
                                                {log.module}
                                            </span>
                                            <span className={`break-all ${log.level === 'ERROR' ? 'text-red-400' : 'text-foreground'}`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Logs;
