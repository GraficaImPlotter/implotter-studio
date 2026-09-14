import { useState, useCallback, useRef } from "react";

interface UseFormRateLimitOptions {
  /** Tempo de espera em milissegundos (padrão: 3 segundos) */
  cooldownMs?: number;
  /** Callback quando ainda está em cooldown */
  onCooldown?: (secondsRemaining: number) => void;
}

interface UseFormRateLimitReturn {
  /** Função para chamar antes de enviar o formulário */
  canSubmit: () => boolean;
  /** Resetar o cooldown manualmente */
  reset: () => void;
  /** Verificar se está em cooldown */
  isOnCooldown: boolean;
  /** Segundos restantes do cooldown */
  secondsRemaining: number;
}

/**
 * Hook para prevenir spam de submissão de formulários
 * Adiciona um cooldown entre submissões
 */
export function useFormRateLimit(
  options: UseFormRateLimitOptions = {},
): UseFormRateLimitReturn {
  const { cooldownMs = 3000, onCooldown } = options;

  const lastSubmitTime = useRef<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsRemaining(0);
  }, []);

  const canSubmit = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime.current;

    if (timeSinceLastSubmit < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - timeSinceLastSubmit) / 1000);
      setSecondsRemaining(remaining);
      onCooldown?.(remaining);

      // Iniciar contagem regressiva
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              clearCountdown();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      return false;
    }

    // Permitir submissão e registrar tempo
    lastSubmitTime.current = now;
    clearCountdown();
    return true;
  }, [cooldownMs, clearCountdown, onCooldown]);

  const reset = useCallback(() => {
    lastSubmitTime.current = 0;
    clearCountdown();
  }, [clearCountdown]);

  return {
    canSubmit,
    reset,
    isOnCooldown: secondsRemaining > 0,
    secondsRemaining,
  };
}

export default useFormRateLimit;
