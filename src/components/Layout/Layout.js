import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import axiosInstance from '../../lib/instance';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import './Layout.css';

const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5a.5.5 0 0 1-.5-.5v-4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v4a.5.5 0 0 1-.5.5H5a1 1 0 0 1-1-1v-9.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PujaIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M5 14.5c0 2.2 3 4 7 4s7-1.8 7-4H5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
        <path
            d="M12 6c0 1.6-1.2 2.2-1.2 3.3 0 .8.6 1.5 1.2 1.5s1.2-.7 1.2-1.5C13.2 8.2 12 7.6 12 6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const ChadhavaIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M4 14h16v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
        <path
            d="M8 14V9a4 4 0 0 1 8 0v5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
);

const BookingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <rect
            x="6"
            y="4"
            width="12"
            height="16"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        />
        <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="9" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="9" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

function Layout({ children }) {
    const { t } = useTranslation();
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [user, setUser] = useState(null);
    const closeMenu = () => setMenuOpen(false);

    // ⭐ 🔥 FIXED: Check auth on EVERY route change + mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token) {
            setUser(null);
            return;
        }

        // Use stored user as initial display (avoids flash) while we fetch latest profile
        const getImageUrl = (u) =>
            u?.profileImageUrl || u?.profileImage || u?.avatar || u?.profilePic || null;
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr);
                setUser({
                    name: parsed.name,
                    role: parsed.role,
                    mobile: parsed.mobile,
                    profileImageUrl: getImageUrl(parsed),
                });
            } catch {
                setUser(null);
            }
        }

        // Always fetch profile from API when token exists (login API may not return avatar)
        const fetchUser = async () => {
            try {
                const res = await axiosInstance.get('/auth/profile');
                if (res.data?.success && res.data?.user) {
                    const u = res.data.user;
                    const imageUrl = getImageUrl(u);
                    const userData = {
                        name: u.name,
                        role: u.role,
                        mobile: u.mobile,
                        profileImageUrl: imageUrl || null,
                    };
                    localStorage.setItem('user', JSON.stringify(u));
                    setUser(userData);
                }
            } catch (err) {
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
                setUser(null);
            }
        };
        fetchUser();
    }, [location.pathname]); // 🔥 KEY FIX: Re-checks on every navigation!

    // Refetch profile when Profile page updates (e.g. avatar change)
    useEffect(() => {
        const getImageUrl = (u) =>
            u?.profileImageUrl || u?.profileImage || u?.avatar || u?.profilePic || null;
        const onProfileUpdated = () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            axiosInstance.get('/auth/profile').then((res) => {
                if (res.data?.success && res.data?.user) {
                    const u = res.data.user;
                    const userData = {
                        name: u.name,
                        role: u.role,
                        mobile: u.mobile,
                        profileImageUrl: getImageUrl(u) || null,
                    };
                    localStorage.setItem('user', JSON.stringify(u));
                    setUser(userData);
                }
            }).catch(() => {});
        };
        window.addEventListener('profile-updated', onProfileUpdated);
        return () => window.removeEventListener('profile-updated', onProfileUpdated);
    }, []);

    // Scroll to top when navigating to Home or Puja
    useEffect(() => {
        if (['/', '/puja', '/chadhava', '/about', '/contact'].includes(location.pathname)) {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile hamburger menu when clicking anywhere outside header
    useEffect(() => {
        const handleOutsideMenuClick = (event) => {
            if (menuOpen && !event.target.closest('.header')) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideMenuClick);
        return () => document.removeEventListener('mousedown', handleOutsideMenuClick);
    }, [menuOpen]);

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileOpen && !event.target.closest('.profile-container')) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileOpen]);

    // ⭐ LOGOUT FUNCTION
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setProfileOpen(false);
        navigate('/');
    };

    // ⭐ 🔥 SIMPLIFIED: Direct token check
    const isLoggedIn = !!localStorage.getItem('token');
    const SHOW_PROFILE_MENU = true; // Show profile dropdown when logged in

    const mobileNavItems = [
        { path: '/', label: t('nav.home'), icon: 'home' },
        { path: '/puja', label: t('nav.puja'), icon: 'puja' },
        { path: '/chadhava', label: t('nav.chadhava'), icon: 'chadhava' },
        { path: '/my-bookings', label: t('nav.bookings'), icon: 'bookings', requiresAuth: true },
    ];

    const isPujaDetailPage = /^\/puja\/.+/.test(location.pathname);
    const isBillingPage = location.pathname.startsWith('/billing');

    const isPathActive = (targetPath) => {
        if (targetPath === '/') return location.pathname === '/';
        return location.pathname.startsWith(targetPath);
    };

    const handleMobileNavClick = (item) => {
        if (item.requiresAuth && !isLoggedIn) {
            navigate('/login');
            return;
        }
        if (location.pathname === item.path) return;
        navigate(item.path);
    };

    return (
        <div className="app-wrap">
            <header className={`header ${isScrolled ? 'scrolled' : ''} ${menuOpen ? 'open' : ''}`}>
                <nav className="nav-container">
                    <Link to="/" className="logo">
                        <img src="/logo.png" alt="Shri AAUM" className="logo-img" />
                    </Link>
                    <ul className="nav-links">
                        <li className="nav-item-mobile-hide">
                            <Link
                                to="/"
                                className={location.pathname === '/' ? 'active' : ''}
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); closeMenu(); }}
                            >
                                {t('nav.home')}
                            </Link>
                        </li>
                        <li>
                            <NavLink
                                to="/puja"
                                className={isPathActive('/puja') ? 'active' : ''}
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); closeMenu(); }}
                            >
                                {t('nav.puja')}
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/chadhava"
                                className={isPathActive('/chadhava') ? 'active' : ''}
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); closeMenu(); }}
                            >
                                {t('nav.chadhava')}
                            </NavLink>
                        </li>
                        <li>
                            <Link
                                to="/about"
                                className={location.pathname === '/about' ? 'active' : ''}
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); closeMenu(); }}
                            >
                                {t('nav.about')}
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/contact"
                                className={location.pathname === '/contact' ? 'active' : ''}
                                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); closeMenu(); }}
                            >
                                {t('nav.contact')}
                            </Link>
                        </li>
                        <li>
                            <a
                                href="https://shriaaum.store/"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={closeMenu}
                            >
                                {t('nav.store')}
                            </a>
                        </li>
                        {/* <li><a href="#library" onClick={closeMenu}>Library</a></li> */}
                    </ul>
                    <div className="nav-right">
                        <LanguageSelector />
                        {/* Profile icon always visible; dropdown only when logged in */}
                        <div className="profile-container">
                            <button
                                type="button"
                                className="profile-trigger"
                                onClick={() => {
                                    if (!isLoggedIn) {
                                        navigate('/login');
                                    } else {
                                        setProfileOpen(!profileOpen);
                                    }
                                }}
                                aria-label={t('nav.profile')}
                            >
                                {user?.profileImageUrl ? (
                                    <img
                                        src={user.profileImageUrl}
                                        alt="Profile"
                                        className="profile-trigger-avatar"
                                    />
                                ) : (
                                    <div className="profile-trigger-default">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="2" fill="none" />
                                            <path d="M20 21v-2a 4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {isLoggedIn && SHOW_PROFILE_MENU && profileOpen && (
                                <div className="profile-dropdown">
                                        <div className="profile-header">
                                            <div className="profile-info">
                                                <div>
                                                    <div className="profile-name">{user?.name}</div>
                                                    <div className="profile-role">{user?.role}</div>
                                                    <div className="profile-email">{user?.mobile}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="profile-menu">
                                            <Link to="/my-bookings" className="profile-item profile-item-my-bookings" onClick={() => setProfileOpen(false)}>
                                                <div className="profile-icon">🕉</div>
                                                <span>{t('nav.myBookings')}</span>
                                                <div className="profile-chevron">›</div>
                                            </Link>

                                            {/* <Link to="/my-chadhava" className="profile-item" onClick={() => setProfileOpen(false)}>
                                                <div className="profile-icon">🙏</div>
                                                <span>My Chadhava Bookings</span>
                                                <div className="profile-chevron">›</div>
                                            </Link> */}

                                            {/* <Link to="/book-puja" className="profile-item new-badge" onClick={() => setProfileOpen(false)}>
                                                <div className="profile-icon">📅</div>
                                                <span>Book a Puja</span>
                                                <div className="profile-badge">New</div>
                                                <div className="profile-chevron">›</div>
                                            </Link> */}

                                            {/* <Link to="/book-chadhava" className="profile-item new-badge" onClick={() => setProfileOpen(false)}>
                                                <div className="profile-icon">🔔</div>
                                                <span>Book a Chadhava</span>
                                                <div className="profile-badge">New</div>
                                                <div className="profile-chevron">›</div>
                                            </Link> */}

                                           
                                        </div>

                                        {/* ⭐ 🔥 LOGOUT BUTTON */}
                                        <div className="profile-menu">
                                            <button 
                                                className="profile-item logout-item"
                                                onClick={handleLogout}
                                            >
                                                <div className="profile-icon">🚪</div>
                                                <span>{t('nav.logout')}</span>
                                                <div className="profile-chevron">›</div>
                                            </button>
                                        </div>

                                        {/* <div className="profile-support">
                                            <div className="support-title">Help & Support for Puja Booking</div>
                                            <div className="support-contact">
                                                <div className="support-phone">
                                                    <span className="phone-icon">📞</span>
                                                    <span>769-67-678 | 10AM-7:30PM</span>
                                                </div>
                                                <div className="support-links">
                                                    <a href="mailto:test@test.com" className="support-link">Email us</a>
                                                    <a href="https://wa.me/0000000000" className="support-link whatsapp">Whatsapp us</a>
                                                </div>
                                            </div>
                                        </div> */}
                                    </div>
                                )}
                        </div>

                        <button
                            type="button"
                            className="menu-toggle"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            aria-label="Toggle menu"
                        >
                            ☰
                        </button>
                    </div>
                </nav>
            </header>
            <main className="layout-main">{children}</main>

            {!isPujaDetailPage && !isBillingPage && (
            <nav className="mobile-bottom-nav" aria-label={t('nav.mobileNavigation')}>
                {mobileNavItems.map((item) => {
                    const active = isPathActive(item.path);
                    return (
                        <button
                            key={item.path}
                            type="button"
                            className={`mobile-bottom-nav-item${active ? ' active' : ''}`}
                            onClick={() => handleMobileNavClick(item)}
                        >
                            <span className="mobile-bottom-nav-indicator" />
                            <span className="mobile-bottom-nav-icon" aria-hidden="true">
                                {item.icon === 'home' && <HomeIcon />}
                                {item.icon === 'puja' && <PujaIcon />}
                                {item.icon === 'chadhava' && <ChadhavaIcon />}
                                {item.icon === 'bookings' && <BookingsIcon />}
                            </span>
                            <span className="mobile-bottom-nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
            )}
        </div>
    );
}

export default Layout;
