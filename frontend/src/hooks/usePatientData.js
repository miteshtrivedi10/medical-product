import { useEffect, useRef, useState } from "react";
import {
  getMe,
  getPatientDetail,
  sendPresenceHeartbeat,
} from "../api";
import { PRESENCE_HEARTBEAT_INTERVAL } from "../constants";

export function usePatientData(sessionToken, selectedPatientId) {
  const [patientDetail, setPatientDetail] = useState(null);
  const [globalError, setGlobalError] = useState("");
  const summaryPollingRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getMe(sessionToken)
      .catch((error) => {
        if (!cancelled) {
          setGlobalError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedPatientId) {
      return undefined;
    }

    getPatientDetail(sessionToken, selectedPatientId)
      .then((payload) => {
        if (!cancelled) {
          setPatientDetail(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setGlobalError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPatientId, sessionToken]);

  useEffect(() => {
    if (!selectedPatientId) {
      return undefined;
    }

    async function beat() {
      try {
        const payload = await sendPresenceHeartbeat(sessionToken, selectedPatientId);
        setPatientDetail((current) =>
          current && current.id === selectedPatientId
            ? { ...current, active_editors: payload.active_editors }
            : current,
        );
      } catch (error) {
        setGlobalError(error.message);
      }
    }

    beat();
    const intervalId = window.setInterval(beat, PRESENCE_HEARTBEAT_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [selectedPatientId, sessionToken]);

  useEffect(() => {
    if (summaryPollingRef.current) {
      window.clearInterval(summaryPollingRef.current);
      summaryPollingRef.current = null;
    }

    if (!patientDetail || patientDetail.latest_summary.status !== "generating") {
      return undefined;
    }

    summaryPollingRef.current = window.setInterval(async () => {
      try {
        const payload = await getPatientDetail(sessionToken, patientDetail.id);
        setPatientDetail(payload);
      } catch (error) {
        setGlobalError(error.message);
      }
    }, 2500);

    return () => {
      if (summaryPollingRef.current) {
        window.clearInterval(summaryPollingRef.current);
        summaryPollingRef.current = null;
      }
    };
  }, [patientDetail, sessionToken]);

  return { patientDetail, setPatientDetail, globalError, setGlobalError };
}
