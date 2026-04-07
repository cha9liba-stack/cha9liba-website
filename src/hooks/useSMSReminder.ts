import { useEffect, useRef } from "react";
import { checkAndSendReminders } from "../services/smsService";
import type { Contract } from "../types";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function useSMSReminder(contracts: Contract[]) {
  const contractsRef = useRef(contracts);
  contractsRef.current = contracts;

  useEffect(() => {
    const run = async () => {
      if (contractsRef.current.length === 0) return;
      await checkAndSendReminders(contractsRef.current);
    };

    run();
    const interval = setInterval(run, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
