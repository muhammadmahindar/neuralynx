import { cn, getScoreColor } from "@/lib/utils";

export const ScoreBar = ({ score, label }: { score: number, label: string }) => {
    return (
        <div className="space-y-2 w-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{label || 'Score'}</span>
                <span>
                    {Math.round(score ?? 0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
                <div
                    className={cn('h-2 rounded-full transition-all duration-300', getScoreColor(score))}
                    style={{ width: `${Math.round(score ?? 0)}%` }}
                />
            </div>
        </div>
    );
};