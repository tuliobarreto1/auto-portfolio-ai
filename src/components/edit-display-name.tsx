"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, X } from "lucide-react";

interface EditDisplayNameProps {
    currentName: string;
    onNameUpdated?: (newName: string) => void;
}

export function EditDisplayName({ currentName, onNameUpdated }: EditDisplayNameProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!displayName.trim()) {
            alert("Nome não pode ser vazio");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/portfolio/update-name", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName }),
            });

            if (!res.ok) {
                throw new Error("Falha ao atualizar nome");
            }

            setIsEditing(false);
            onNameUpdated?.(displayName);
        } catch (error) {
            console.error(error);
            alert("Erro ao atualizar nome. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setDisplayName(currentName);
        setIsEditing(false);
    };

    if (!isEditing) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Bem-vindo, {currentName}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-6 w-6 p-0"
                >
                    <Pencil className="w-3 h-3" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="h-8 w-48"
                disabled={isSaving}
            />
            <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
            >
                <Check className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
}
