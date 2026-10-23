import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { getDateLocale } from "../../i18n/content";
import { localizeApiError } from "../../i18n/apiErrors";
import "./Profile.css";

// Stored values stay English; the label is translated (profile.zodiacSigns.<value>).
const ZODIAC_SIGNS = [
  ["aries", "♈"], ["taurus", "♉"], ["gemini", "♊"], ["cancer", "♋"],
  ["leo", "♌"], ["virgo", "♍"], ["libra", "♎"], ["scorpio", "♏"],
  ["sagittarius", "♐"], ["capricorn", "♑"], ["aquarius", "♒"], ["pisces", "♓"],
];

function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 35 }); // 0-100 each axis
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    zodiacSign: "",
  });
  const [originalData, setOriginalData] = useState({});
  const [userMeta, setUserMeta] = useState({}); // role, isActive, etc.

  // Load user data on mount - PERFECT API MAPPING
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axiosInstance.get("/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          const user = res.data.user;

          // ✅ EXACT FIELD MAPPING from API response
          const userData = {
            name: user.name || "",
            mobile: user.mobile || "",
            email: user.email || "",
            zodiacSign: user.zodiacSign || "",
          };

          setFormData(userData);
          setOriginalData(userData);

          // ✅ Meta data for display only
          setUserMeta({
            role: user.role || "devotee",
            isActive: user.isActive || false,
            isVerified: user.isVerified || false,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          });

          // Avatar (support multiple possible backend field names)
          const imageUrl =
            user.profileImageUrl ||
            user.profileImage ||
            user.avatar ||
            user.profilePic;
          if (imageUrl) setAvatarPreview(imageUrl);
          const savedPos = localStorage.getItem("profile_avatar_position");
          if (savedPos) {
            try {
              const parsed = JSON.parse(savedPos);
              if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number") {
                setImagePosition({ x: parsed.x, y: parsed.y });
              }
            } catch {
              const match = String(savedPos).match(/(\d+)\s*%\s*(\d+)/);
              if (match) {
                setImagePosition({ x: parseInt(match[1], 10), y: parseInt(match[2], 10) });
              }
            }
          }
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        alert(t("profile.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [t]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t("profile.imageTooLarge"));
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const hasChanges = () => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
    return formChanged || !!avatarFile;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const updateData = new FormData();

      // ✅ SEND EXACT API FIELDS
      updateData.append("name", formData.name);
      updateData.append("mobile", formData.mobile);
      if (formData.email) {
        updateData.append("email", formData.email);
      }
      updateData.append("zodiacSign", formData.zodiacSign);

      if (avatarFile) {
        updateData.append("profileImage", avatarFile);
      }

      const res = await axiosInstance.put("/auth/profile", updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setOriginalData(formData);
        if (avatarFile) {
          setAvatarFile(null);
        }
        if (res.data.user) {
          const updatedUser = res.data.user;
          const imageUrl =
            updatedUser.profileImageUrl ||
            updatedUser.profileImage ||
            updatedUser.avatar ||
            updatedUser.profilePic;
          if (imageUrl) {
            setAvatarPreview(imageUrl);
          }
          localStorage.setItem("user", JSON.stringify(updatedUser));
          window.dispatchEvent(new CustomEvent("profile-updated"));
        }
        alert(t("profile.updated"));
        navigate(-1);
      }
    } catch (err) {
      alert(localizeApiError(err, t("profile.updateFailed"), t, i18n.language));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">{t("profile.loading")}</div>;

  return (
    <div className="profile-page1">
      <div className="profile-container1">
        {/* Header */}
        <div className="profile-header1">
          <h1 className="profile-title1">{t("profile.title")}</h1>
          <p className="profile-subtitle1">
            {hasChanges()
              ? t("profile.unsaved")
              : t("profile.subtitle")}
          </p>
        </div>

        {/* Avatar & Status */}
        <div className="avatar-section">
          <div className="avatar-wrapper">
            <div className="avatar-container">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={t("profile.avatarAlt")}
                  className="profile-avatar-img"
                  style={{
                    objectFit: "cover",
                    objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  }}
                />
              ) : (
                <div className="avatar-placeholder">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="#999"
                      strokeWidth="2"
                    />
                    <path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      stroke="#999"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="avatar-actions">
              <label className="avatar-btn primary">
                {avatarPreview ? t("profile.changePhoto") : t("profile.addPhoto")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </label>
              {avatarPreview && (
                <button
                  type="button"
                  className="avatar-btn secondary"
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                  }}
                >
                  {t("profile.remove")}
                </button>
              )}
            </div>
            {avatarPreview && (
              <div className="avatar-adjust-section">
                <div className="avatar-adjust-header">
                  <span className="avatar-adjust-title">{t("profile.position")}</span>
                </div>
                <div className="avatar-adjust-sliders">
                  <div className="avatar-adjust-row">
                    <span className="avatar-adjust-axis">{t("profile.horizontal")}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imagePosition.x}
                      onChange={(e) => {
                        const x = parseInt(e.target.value, 10);
                        const next = { ...imagePosition, x };
                        setImagePosition(next);
                        localStorage.setItem("profile_avatar_position", JSON.stringify(next));
                      }}
                      className="avatar-adjust-slider"
                      aria-label={t("profile.horizontalPosition")}
                    />
                  </div>
                  <div className="avatar-adjust-row">
                    <span className="avatar-adjust-axis">{t("profile.vertical")}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imagePosition.y}
                      onChange={(e) => {
                        const y = parseInt(e.target.value, 10);
                        const next = { ...imagePosition, y };
                        setImagePosition(next);
                        localStorage.setItem("profile_avatar_position", JSON.stringify(next));
                      }}
                      className="avatar-adjust-slider"
                      aria-label={t("profile.verticalPosition")}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Status Badge */}
          <div className="status-badges">
            <span
              className={`badge ${
                userMeta.isVerified ? "verified" : "pending"
              }`}
            >
              {userMeta.isVerified ? `✅ ${t("profile.verified")}` : t("profile.pending")}
            </span>
            <span
              className={`badge ${userMeta.isActive ? "active" : "inactive"}`}
            >
              {userMeta.isActive ? t("profile.active") : t("profile.inactive")}
            </span>
          </div>
        </div>

        {/* Editable Form - API Fields Only */}
        <div className="profile-form">
          <div className="form-group full-width">
            <label>{t("profile.fullName")}</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("profile.fullNamePlaceholder")}
            />
          </div>

          <div className="form-group full-width">
            <label>{t("profile.mobile")}</label>
            <input
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              disabled // Verified mobile typically read-only
            />
          </div>

          <div className="form-group full-width">
            <label>{t("profile.zodiac")}</label>
              <select
                name="zodiacSign"
                value={formData.zodiacSign}
                onChange={handleInputChange}
              >
                {ZODIAC_SIGNS.map(([value, symbol]) => (
                  <option key={value} value={value}>{t(`profile.zodiacSigns.${value}`)} {symbol}</option>
                ))}
              </select>
          </div>

          {/* ✅ Read-only Account Info */}
          <div className="info-section">
            <h3>{t("profile.account")}</h3>
            <div className="info-grid">
              <div className="info-item">
                <span>{t("profile.role")}</span> <strong>{t(`profile.roles.${userMeta.role}`, { defaultValue: userMeta.role })}</strong>
              </div>
              <div className="info-item">
                <span>{t("profile.joined")}</span>{" "}
                <strong>
                  {new Date(userMeta.createdAt).toLocaleDateString(getDateLocale(i18n.language))}
                </strong>
              </div>
              <div className="info-item">
                <span>{t("profile.lastLogin")}</span>{" "}
                <strong>
                  {new Date(userMeta.lastLoginAt).toLocaleDateString(getDateLocale(i18n.language))}
                </strong>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn secondary"
              onClick={() => navigate("/")}
              disabled={saving}
            >
              {t("profile.cancel")}
            </button>
            <button
              className={`btn primary ${hasChanges() ? "active" : ""}`}
              onClick={handleSave}
              disabled={!hasChanges() || saving}
            >
              {saving ? t("profile.saving") : t("profile.update")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
