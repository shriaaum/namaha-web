import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../lib/instance';
import { useTranslation } from 'react-i18next';
import './LoginPage.css';

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const countryCode = '+91';
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);

  // Profile fields
  const [name, setName] = useState('');

  // Send OTP
  const sendOtp = async () => {
    if (!mobile || mobile.length !== 10) {
      setError(t('auth.invalidMobile'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.post('/auth/send-otp', { mobile, countryCode });
      
      if (res.data.success) {
        setStep(2);
        setError(t('auth.otpSentSuccess'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('auth.sendOtpFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError(t('auth.invalidOtp'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.post('/auth/verify-otp', { 
        mobile, 
        otp,
        countryCode,
      });
      
      
      if (res.data.success) {
        const newToken = res.data.token;
        setToken(newToken);
        localStorage.setItem('token', newToken);
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        
        if (res.data.isNewUser) {
          setStep(3);
        } else {
          const returnTo = location.state?.returnTo;
          const returnState = location.state?.returnState;
          if (returnTo) {
            navigate(returnTo, returnState ? { state: returnState } : undefined);
          } else {
            navigate('/');
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || t('auth.invalidOtpMessage'));
    } finally {
      setLoading(false);
    }
  };

  // Complete Profile
  const completeProfile = async () => {
    if (!name || !token) { 
      setError(t('auth.nameRequired'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.post('/auth/complete-profile', {
        name,
        dob: null,
        zodiacSign: null,
        email: null,
      });
      
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      const returnTo = location.state?.returnTo;
      const returnState = location.state?.returnState;
      if (returnTo) {
        navigate(returnTo, returnState ? { state: returnState } : undefined);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('auth.profileUpdateFailed'));
      console.error('❌ Error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/logo.png" alt="Shri AAUM" className="login-logo" />
          <h1>{t('auth.welcome')}</h1>
          <p>
            {location.state?.returnTo === '/billing'
              ? 'Login to complete your puja booking'
              : 'Enter your mobile to receive OTP'}
          </p>
        </div>

        {error && (
          <div className="login-error">{error}</div>
        )}

        {/* STEP 1: Mobile */}
        {step === 1 && (
          <div className="login-form">
            <div className="login-input-group">
              <label>{t('auth.mobile')}</label>
              <div className="login-phone-input">
                <span>{countryCode}</span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendOtp(); }}
                  placeholder={t('auth.mobilePlaceholder')}
                  maxLength={10}
                />
              </div>
            </div>
            <button 
              className="login-btn" 
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.sendOtp')}
            </button>
          </div>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <div className="login-form">
            <div className="login-otp-header">
              <p>{t('auth.otpSent', { mobile })}</p>
              <button className="login-resend" onClick={() => setStep(1)}>
                Change Number
              </button>
            </div>
            <div className="login-input-group">
              <label>{t('auth.enterOtp')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') verifyOtp(); }}
                placeholder="123456"
                maxLength={6}
              />
            </div>
            <button 
              className="login-btn" 
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
            >
              {loading ? t('common.loading') : t('auth.verifyOtp')}
            </button>
          </div>
        )}

        {/* STEP 3: Profile */}
        {step === 3 && (
          <div className="login-form">
            <h3>{t('auth.completeProfile')}</h3>
            <p>Create your devotee profile to continue</p>
            
            <div className="login-input-group">
              <label>{t('auth.fullName')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') completeProfile(); }}
                placeholder={t('auth.namePlaceholder')}
              />
            </div>

            <button 
              className="login-btn" 
              onClick={completeProfile}
              disabled={loading || !name} 
            >
              {loading ? t('common.loading') : t('auth.completeProfile')}
            </button>
          </div>
        )}

        <div className="login-footer">
          <p>{t('auth.terms')}</p>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
