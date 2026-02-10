"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Bot,
  Info,
  Send,
} from "lucide-react";

interface Note {
  id: string;
  author: string;
  content: string;
  note_type: string;
  created_at: string;
}

interface ActivityFeedProps {
  projectId: string;
  notes: Note[];
  onNoteAdded: () => void;
}

const noteTypeConfig: Record<
  string,
  { icon: typeof MessageSquare; color: string; label: string }
> = {
  note: { icon: MessageSquare, color: "text-blue-600", label: "Note" },
  instruction: { icon: Info, color: "text-purple-600", label: "Instruction" },
  stage_change: {
    icon: ArrowRight,
    color: "text-green-600",
    label: "Stage Change",
  },
  status_change: {
    icon: AlertTriangle,
    color: "text-orange-600",
    label: "Status Change",
  },
  agent_trigger: { icon: Bot, color: "text-indigo-600", label: "Agent Trigger" },
  system: { icon: Info, color: "text-slate-500", label: "System" },
};

export function ActivityFeed({
  projectId,
  notes,
  onNoteAdded,
}: ActivityFeedProps) {
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim(), note_type: "note" }),
      });

      if (res.ok) {
        setNewNote("");
        onNoteAdded();
      }
    } catch (err) {
      console.error("Error adding note:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a note or instruction..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={submitting || !newNote.trim()}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Timeline */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </p>
          ) : (
            notes.map((note) => {
              const config = noteTypeConfig[note.note_type] || noteTypeConfig.system;
              const Icon = config.icon;
              return (
                <div key={note.id} className="flex gap-3 text-sm">
                  <div
                    className={`flex-shrink-0 mt-0.5 ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{note.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
