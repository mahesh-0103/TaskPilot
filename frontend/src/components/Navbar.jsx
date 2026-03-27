import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Activity } from 'lucide-react';

export default function Navbar({ isDashboard = false }) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isDashboard) return null; // Dashboard uses Sidebar + simple top row in its own layout if needed, but the prompt says Navbar is sticky on Landing.

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300',
        scrolled ? 'bg-background/85 backdrop-blur-xl border-b border-borderline' : 'bg-transparent'
      )}
    >
      <Link to="/" className="text-text-1 font-display font-bold text-lg cursor-pointer">
        TaskPilot
      </Link>
      
      <div className="hidden md:flex items-center space-x-8">
        {['Dashboard', 'Extract', 'Logs'].map(item => (
          <Link
            key={item}
            to={`/${item.toLowerCase()}`}
            className="text-[14px] font-ui text-text-2 hover:text-white transition-colors duration-200"
          >
            {item}
          </Link>
        ))}
        
        <Link 
          to="/dashboard"
          className="bg-primary text-white px-5 py-2.5 rounded-full font-ui text-sm hover:scale-[1.02] transform transition-transform"
        >
          Open App →
        </Link>
      </div>
    </motion.nav>
  );
}
