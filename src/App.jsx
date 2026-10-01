import { useState, useEffect } from 'react';
import { 
  ShieldCheck, PhoneOff, User, AlertTriangle, MessageSquare, 
  Hash, ShieldAlert, Phone, PhoneCall, Mic, CheckCircle2, 
  AlertCircle, Activity, Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import './App.css';

function App() {
  const [callStatus, setCallStatus] = useState('incoming'); // incoming, active, ended
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [overallRisk, setOverallRisk] = useState(15);
  const [historyData, setHistoryData] = useState(Array.from({length: 1}, (_, i) => ({ time: i, risk: 15 })));
  const [micVolume, setMicVolume] = useState(0);

  // Simulation flags
  const [simulateFraudNumber, setSimulateFraudNumber] = useState(false);
  const [simulateSpoofed, setSimulateSpoofed] = useState(false);
  
  // Mic Volume Analyzer
  useEffect(() => {
    let audioContext;
    let microphone;
    let analyser;
    let dataArray;
    let animationId;
    let streamRef;

    if (callStatus === 'active') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamRef = stream;
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(analyser);
          
          dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            let average = sum / dataArray.length;
            setMicVolume(average);
            animationId = requestAnimationFrame(updateVolume);
          };
          
          updateVolume();
        })
        .catch(err => console.error("Mic access denied", err));
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
      if (streamRef) streamRef.getTracks().forEach(track => track.stop());
    };
  }, [callStatus]);

  // Timer and simulation logic
  useEffect(() => {
    if (callStatus !== 'active') return;
    
    setTimeElapsed(0);
    
    let initialRisk = 15;
    if (simulateFraudNumber || simulateSpoofed) {
      initialRisk = 95;
    }
    
    setOverallRisk(initialRisk);
    setHistoryData([{ time: 0, risk: initialRisk }]);

    // Update every 500ms
    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const nextTime = prev + 0.5;
        
        // If pre-existing metadata risk, terminate quickly after showing it
        if ((simulateFraudNumber || simulateSpoofed) && nextTime > 1.5) {
          setCallStatus('ended');
          clearInterval(interval);
          return nextTime;
        }

        if (nextTime > 16.5) {
          setCallStatus('ended');
          clearInterval(interval);
          return 16.5;
        }
        return nextTime;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [callStatus, simulateFraudNumber, simulateSpoofed]);

  // Update risk based on time
  useEffect(() => {
    if (callStatus !== 'active') return;

    let newRisk = overallRisk;
    
    if (simulateFraudNumber || simulateSpoofed) {
      newRisk = 90 + Math.floor(Math.random() * 10);
    } else {
      if (timeElapsed <= 10) {
        newRisk = 15 + Math.floor(Math.random() * 20);
      } else if (timeElapsed <= 15) {
        const baseRisk = 35 + ((timeElapsed - 10) / 5) * 55;
        const jitter = (Math.random() * 16) - 8;
        newRisk = Math.min(100, Math.max(0, Math.floor(baseRisk + jitter)));
      } else {
        newRisk = 90 + Math.floor(Math.random() * 10);
      }
    }
    
    setOverallRisk(newRisk);
    setHistoryData(prev => {
      if (prev.length > 0 && prev[prev.length - 1].time === timeElapsed) return prev;
      return [...prev, { time: timeElapsed, risk: newRisk }];
    });
  }, [timeElapsed, callStatus, simulateFraudNumber, simulateSpoofed]);

  const formatTime = (seconds) => {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'risk-high';
    if (score >= 40) return 'risk-medium';
    return 'risk-low';
  };

  const calculateStrokeDasharray = (score) => {
    const radius = 50; 
    const circumference = 2 * Math.PI * radius;
    const fillLength = (score / 100) * circumference;
    return `${fillLength}, ${circumference}`;
  };

  const isHighRisk = overallRisk >= 70;

  // INCOMING CALL SCREEN
  if (callStatus === 'incoming') {
    return (
      <div className="app-container desktop-layout">
        <div className="incoming-screen-desktop">
          <div className="incoming-avatar-wrapper">
             <div className="incoming-avatar-ring"></div>
             <div className="incoming-avatar">
               <User size={60} color="white" />
             </div>
          </div>
          <h2 className="incoming-name">Unknown Caller</h2>
          <p className="incoming-number">+91 98765 43210</p>
          <p className="incoming-status">System Ready for Call Analysis...</p>
          
          <div className="simulation-controls">
            <h4 style={{marginBottom: '10px', fontSize: '13px', color: 'var(--text-muted)'}}>Demo Settings:</h4>
            <label className="sim-checkbox">
              <input type="checkbox" checked={simulateFraudNumber} onChange={e => setSimulateFraudNumber(e.target.checked)} />
              Flag Number in Fraud Report
            </label>
            <label className="sim-checkbox">
              <input type="checkbox" checked={simulateSpoofed} onChange={e => setSimulateSpoofed(e.target.checked)} />
              Spoof Metadata / Routing
            </label>
          </div>

          <div className="incoming-actions">
            <button className="btn-decline" onClick={() => setCallStatus('ended')}>
              <PhoneOff size={32} />
            </button>
            <button className="btn-accept" onClick={() => setCallStatus('active')}>
              <PhoneCall size={32} />
              <span style={{ marginLeft: '10px', fontSize: '18px', fontWeight: 'bold' }}>Accept & Analyze</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE OR ENDED CALL SCREEN
  return (
    <div className="app-container desktop-layout">
      {/* Header */}
      <div className="desktop-header">
        <div className="logo-section">
          <ShieldCheck className="shield-icon" size={24} />
          <h1>VoxShield AI Dashboard</h1>
        </div>
        <div className="live-indicator">
          {callStatus === 'active' && <div className="dot"></div>}
          <span>{callStatus === 'active' ? 'Live Monitoring Active' : 'Session Ended'}</span>
        </div>
      </div>

      <div className="desktop-content">
        {/* Left Column */}
        <div className="left-panel">
          
          {/* Caller Info Card */}
          <div className="card caller-card">
            <div className="caller-info-header">
              <div className="avatar-large">
                <User size={24} />
              </div>
              <div className="caller-details">
                <h2>Unknown Caller</h2>
                <p className="number">+91 98765 43210</p>
                <div className="call-timer-large">
                  {callStatus === 'active' ? <Phone size={14} /> : <PhoneOff size={14} />}
                  <span>Duration: {formatTime(timeElapsed)}</span>
                </div>
              </div>
              <div className="call-action-large">
                {callStatus === 'ended' ? (
                  <div className="ended-badge">
                    <PhoneOff size={16} /> Ended
                  </div>
                ) : (
                  <button className="btn-end-large" onClick={() => setCallStatus('ended')}>
                    <PhoneOff size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Mic Indicator */}
            <div className="mic-indicator-section">
              <div className="mic-icon-wrapper">
                <Mic size={16} color={callStatus === 'active' ? "var(--color-primary)" : "var(--text-muted)"} />
                <span>Live Audio Stream:</span>
              </div>
              <div className="audio-bars">
                {[...Array(30)].map((_, i) => (
                    <div 
                      key={i} 
                      className="audio-bar" 
                      style={{ 
                        height: callStatus === 'active' ? `${Math.max(4, (micVolume / 1.5) * Math.random() + 4)}px` : '4px',
                        backgroundColor: callStatus === 'active' ? 'var(--color-primary)' : 'var(--bg-card-light)'
                      }} 
                    />
                ))}
              </div>
            </div>
          </div>

          {/* Risk Breakdown Card */}
          <div className="card breakdown-card">
            <h3 className="card-title">Analysis Breakdown</h3>
            <div className="risk-breakdown-list">
              
              {/* Number Risk */}
              <div className="breakdown-item">
                <div className="breakdown-icon">
                  {simulateFraudNumber ? <AlertCircle size={20} className="text-high" /> : <CheckCircle2 size={20} className="text-low" />}
                </div>
                <div className="breakdown-details">
                  <div className="breakdown-header">
                    <h4>Number Risk</h4>
                    {simulateFraudNumber && <span className="score-pill danger">Fraud DB</span>}
                  </div>
                  <p>Verified Data / Fraud Report Reputation</p>
                  <p className="status-text">{simulateFraudNumber ? "Number found in national fraud database!" : "Number appears clean, no recent fraud reports"}</p>
                </div>
              </div>

              {/* Spoofing / Metadata */}
              <div className="breakdown-item">
                <div className="breakdown-icon">
                  {simulateSpoofed ? <Info size={20} className="text-high" /> : <CheckCircle2 size={20} className="text-low" />}
                </div>
                <div className="breakdown-details">
                  <div className="breakdown-header">
                    <h4>Spoofing / Metadata</h4>
                    {simulateSpoofed && <span className="score-pill danger">Spoofed</span>}
                  </div>
                  <p>Network & Context Risk</p>
                  <p className="status-text">{simulateSpoofed ? "Origin mismatch! Spoofed caller ID detected." : "Metadata aligns with standard carrier routes"}</p>
                </div>
              </div>

              {/* Voice Risk */}
              <div className="breakdown-item">
                <div className="breakdown-icon">
                  {isHighRisk && !simulateFraudNumber && !simulateSpoofed ? <AlertCircle size={20} className="text-high" /> : <CheckCircle2 size={20} className="text-low" />}
                </div>
                <div className="breakdown-details">
                  <div className="breakdown-header">
                    <h4>Voice Risk</h4>
                    {isHighRisk && !simulateFraudNumber && !simulateSpoofed && <span className="score-pill danger">Synthetic</span>}
                  </div>
                  <p>Voice Analysis</p>
                  <p className="status-text">{isHighRisk && !simulateFraudNumber && !simulateSpoofed ? "Cloned/Synthetic voice patterns detected!" : "Natural human prosody and spectral features"}</p>
                </div>
              </div>

              {/* Content Risk */}
              <div className="breakdown-item">
                <div className="breakdown-icon">
                  {isHighRisk && !simulateFraudNumber && !simulateSpoofed ? <AlertCircle size={20} className="text-warning" /> : <CheckCircle2 size={20} className="text-low" />}
                </div>
                <div className="breakdown-details">
                  <div className="breakdown-header">
                    <h4>Content Risk</h4>
                    {isHighRisk && !simulateFraudNumber && !simulateSpoofed && <span className="score-pill warning">Suspicious</span>}
                  </div>
                  <p>Speech / Word Analysis</p>
                  <p className="status-text">{isHighRisk && !simulateFraudNumber && !simulateSpoofed ? "Scam intent keywords detected" : "Conversational content normal"}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="right-panel">
          {/* Main Score Card */}
          <div className="card score-card">
            <div className="score-display-wrapper">
              <div className="risk-dial-large">
                <svg viewBox="0 0 120 120" className="circular-chart-large">
                  <path className="circle-bg"
                    d="M60 10 a 50 50 0 0 1 0 100 a 50 50 0 0 1 0 -100"
                  />
                  <path className={`circle ${getRiskColor(overallRisk)}`}
                    strokeDasharray={calculateStrokeDasharray(overallRisk)}
                    d="M60 10 a 50 50 0 0 1 0 100 a 50 50 0 0 1 0 -100"
                  />
                  <text x="60" y="65" className="percentage-large">{overallRisk}</text>
                  <text x="60" y="85" className="percentage-label-large">/ 100 RISK</text>
                </svg>
              </div>
              <div className="score-status-text">
                {isHighRisk ? (
                  <>
                    <h2 className="text-high">CRITICAL RISK</h2>
                    <p>
                      {simulateFraudNumber ? "Number identified in fraud reports." : 
                       simulateSpoofed ? "Spoofed network metadata detected." : 
                       "AI-generated voice detected."}
                      <br/>Call has been terminated.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-low">SAFE</h2>
                    <p>Real-time analysis indicates<br/>genuine human interaction.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Graph Card */}
          <div className="card graph-card">
            <h3 className="card-title">Real-time Risk Trajectory</h3>
            <div className="graph-container-large">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" vertical={false} />
                  <XAxis dataKey="time" stroke="#8b92a5" tickFormatter={(val) => Math.floor(val)} />
                  <YAxis stroke="#8b92a5" domain={[0, 100]} />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Threshold (70)', fill: '#ef4444', fontSize: 12 }} />
                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    stroke={isHighRisk ? "#ef4444" : "#3b82f6"} 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Banner */}
          {callStatus === 'ended' ? (
            <div className="action-banner-large danger-banner">
              <ShieldAlert size={28} />
              <div className="action-text">
                <h3>Call Terminated Automatically</h3>
                <p>VoxShield intercepted this call due to a critical risk score of {overallRisk}/100.</p>
              </div>
            </div>
          ) : (
            <div className="action-banner-large safe-banner">
              <ShieldCheck size={28} />
              <div className="action-text">
                <h3>Active Protection Enabled</h3>
                <p>Continuously scanning voice, content, and metadata...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
