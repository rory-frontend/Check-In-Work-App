'use client'
import { cn, formatTime } from "@/component/utils";
import { useEffect, useRef, useState, useCallback } from "react";

export const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Home() {
  const [time, setTime] = useState(new Date());
  const [onBreak, setOnBreak] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [missedTime, setMissedTime] = useState(0);
  const [startCounting, setStartCounting] = useState(false);
  const [nextPopupTime, setNextPopupTime] = useState<Date | null>(null);
  // User input for start and end times
  const [startTime, setStartTime] = useState('14:45');
  const [endTime, setEndTime] = useState('14:55');

  const missedTimerRef = useRef<number | null>(null);
  const popupTimerRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const popupCountRef = useRef(0); // synchronous popup count

  // Logging
  const log = useCallback((msg: string, cls = '') => {
    const line = document.createElement('div');
    line.className = cn('log-entry text-xs', cls);
    line.textContent = `${new Date().toLocaleTimeString()}: ${msg}`;
    logRef.current?.prepend(line);
  }, []);

  // Clock update every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit' } as const;
  const currentDay = time.getDay();
  const currentTime = time.toLocaleString(undefined, timeOptions);

  // Break toggle
  const handleBreakToggle = () => {
    setOnBreak(!onBreak);
    log(`Break ${!onBreak ? 'In' : 'Out'} clicked`, 'log-action');
  };

  // Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        log(`Notification permission: ${permission}`, 'log-action');
      });
    }
  }, [log]);

  // Generate random popup time based on user input
  const generateRandomPopup = useCallback(() => {
    const now = new Date();
    const startDate = new Date(now);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(now);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    endDate.setHours(endHour, endMinute, 0, 0);

    const effectiveStart = now > startDate ? now : startDate;
    if (effectiveStart >= endDate) return null;

    return new Date(
      effectiveStart.getTime() + Math.random() * (endDate.getTime() - effectiveStart.getTime())
    );
  }, [startTime, endTime]);

  // Schedule next popup
  const scheduleNextPopup = useCallback(() => {
    if (popupCountRef.current >= 2) return; // stop after 2
    const next = generateRandomPopup();
    if (next) {
      setNextPopupTime(next);
      log(`Random popup scheduled at: ${next.toLocaleTimeString()}`, "log-action");
      log('You are checked in.', 'log-init');
    } else {
      log("You are not checked in", "log-action");
    }
  }, [generateRandomPopup, log]);

  // First popup on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setTimeout(() => scheduleNextPopup(), 0);
    }
  }, [scheduleNextPopup]);

  // Show popup when it's time
  useEffect(() => {
    if (!nextPopupTime || popupCountRef.current >= 2) return;

    const now = new Date();
    const delay = Math.max(nextPopupTime.getTime() - now.getTime(), 0);

    if (popupTimerRef.current != null) clearTimeout(popupTimerRef.current);

    popupTimerRef.current = window.setTimeout(() => {
      const actualTime = new Date();
      setPopupMessage(`Popup at ${actualTime.toLocaleTimeString()}`);
      setShowPopup(true);

      popupCountRef.current += 1;      // increment immediately

      log(`Popup shown at ${actualTime.toLocaleTimeString()}`, 'log-popup');

      // Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Work Check In', { body: 'A random popup appeared!', icon: '/favicon.ico' });
      }

      // Start missed time after 60s
      setTimeout(() => {
        setStartCounting(true);
        missedTimerRef.current = window.setInterval(() => {
          setMissedTime(prev => prev + 1);
        }, 1000);
      }, 60000);

    }, delay);

    return () => {
      if (popupTimerRef.current != null) clearTimeout(popupTimerRef.current);
    };
  }, [nextPopupTime, log]);

  // Handle popup click
  const handlePopupClick = () => {
    setShowPopup(false);

    if (startCounting) {
      log(`Popup clicked after ${formatTime(missedTime)}`, 'log-popup text-red-500');
    } else {
      log(`I'm Here`, 'log-popup text-green-500');
    }

    if (missedTimerRef.current != null) {
      clearInterval(missedTimerRef.current);
      missedTimerRef.current = null;
    }

    setMissedTime(0);
    setStartCounting(false);

    // Schedule next popup only if less than 2
    if (popupCountRef.current < 2) {
      scheduleNextPopup();
    }
  };

  // Handle form submission to update times
  const handleTimeUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    popupCountRef.current = 0;
    scheduleNextPopup();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-radial from-gray-900 to-slate-950 gap-5">
      <h1 className="text-4xl font-mono">Work Check In App</h1>

      {/* Time Input Form */}
      <form onSubmit={handleTimeUpdate} className="flex flex-col gap-2 p-4 bg-gray-800 rounded-lg">
        <div className="flex gap-4">
          <div>
            <label className="block text-white text-sm mb-1">Start Time:</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-2 py-1 rounded bg-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-white text-sm mb-1">End Time:</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="px-2 py-1 rounded bg-gray-700 text-white"
            />
          </div>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
          Update Times
        </button>
      </form>

      <div className="border-8 border-blue-900 rounded-2xl py-5 items-center flex flex-col gap-5 w-full max-w-md">
        <div className="flex gap-5">
          {day.map((data, index) => (
            <div key={index} className={cn("text-gray-500 text-sm", index === currentDay && "text-white font-bold")}>
              {data}
            </div>
          ))}
        </div>

        <div className="text-7xl h-full flex items-center text-white">{currentTime}</div>
      </div>

      {onBreak === false ? (
        <button onClick={handleBreakToggle} className="bg-green-800 button">Break In</button>
      ) : (
        <button onClick={handleBreakToggle} className="bg-red-800 button">Break Out</button>
      )}

      {/* Random Popup */}
      {showPopup && (
        <div className="fixed  left-0  flex items-center justify-center bg-black/0 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <h3 className="mb-2 text-xl font-bold text-gray-800">Confirm You&apos;re Here</h3>
            <p className="mb-4 text-gray-600">
              Please click OK to confirm you&apos;re still working.
              <br />
              {popupMessage}
              <br />
              {startCounting ? <div>You missed time: {formatTime(missedTime)}</div> : <div>You have 1min to click</div>}
            </p>
            <button
              onClick={handlePopupClick}
              className="rounded bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* System Log */}
      <div className="mt-8 w-full max-w-xl">
        <h2 className="mb-2 text-lg font-medium text-white">System Log</h2>
        <div ref={logRef} className="h-48 overflow-y-auto rounded bg-gray-800/50 p-3 font-mono text-xs text-white" />
      </div>
    </div>
  );
}