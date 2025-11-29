"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, Download, Trash2 } from "lucide-react";

interface ScreenRecorderProps {
    repoId: number;
    onRecordingComplete?: (videoBlob: Blob, videoUrl: string) => void;
}

export function ScreenRecorder({ repoId, onRecordingComplete }: ScreenRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            // Solicita permissão para capturar a tela
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: "screen",
                } as MediaTrackConstraints,
                audio: false, // Pode ser mudado para true se quiser áudio
            });

            // Cria o MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp9",
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            // Evento quando dados estão disponíveis
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Evento quando a gravação para
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                setRecordedVideoUrl(url);

                if (onRecordingComplete) {
                    onRecordingComplete(blob, url);
                }

                // Para todas as tracks do stream
                stream.getTracks().forEach((track) => track.stop());
            };

            // Inicia a gravação
            mediaRecorder.start();
            setIsRecording(true);

            // Listener para quando o usuário parar de compartilhar a tela
            stream.getVideoTracks()[0].addEventListener("ended", () => {
                stopRecording();
            });
        } catch (error) {
            console.error("Erro ao iniciar gravação:", error);
            alert("Erro ao iniciar gravação de tela. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const downloadVideo = () => {
        if (recordedVideoUrl) {
            const a = document.createElement("a");
            a.href = recordedVideoUrl;
            a.download = `demo-recording-${repoId}-${Date.now()}.webm`;
            a.click();
        }
    };

    const deleteRecording = () => {
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
            setRecordedVideoUrl(null);
            chunksRef.current = [];
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {!isRecording && !recordedVideoUrl && (
                    <Button size="sm" onClick={startRecording} variant="outline" className="gap-2">
                        <Video className="w-4 h-4" />
                        Gravar Tela da Demo
                    </Button>
                )}

                {isRecording && (
                    <Button size="sm" onClick={stopRecording} variant="destructive" className="gap-2">
                        <Square className="w-4 h-4" />
                        Parar Gravação
                    </Button>
                )}
            </div>

            {recordedVideoUrl && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium">Gravação da Demo</label>
                    <video
                        src={recordedVideoUrl}
                        controls
                        className="w-full rounded-lg border"
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={downloadVideo} variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Baixar Vídeo
                        </Button>
                        <Button size="sm" onClick={deleteRecording} variant="outline" className="gap-2">
                            <Trash2 className="w-4 h-4" />
                            Excluir
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Você pode baixar o vídeo e hospedá-lo (YouTube, Vimeo, etc.) e adicionar o link no campo &quot;Link da Demo&quot;.
                    </p>
                </div>
            )}
        </div>
    );
}
