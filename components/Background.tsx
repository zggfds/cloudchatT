import React from 'react';

const Background: React.FC = () => {
  // Generate random squares
  const squares = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 60 + 20,
    left: Math.random() * 100,
    animationDuration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden -z-10 bg-gradient-to-br from-gray-900 to-blue-900">
      <ul className="absolute inset-0 w-full h-full m-0 p-0 list-none">
        {squares.map((sq) => (
          <li
            key={sq.id}
            className="absolute bottom-[-150px] block bg-white/10 backdrop-blur-sm rounded-lg animate-float"
            style={{
              left: `${sq.left}%`,
              width: `${sq.size}px`,
              height: `${sq.size}px`,
              animationDuration: `${sq.animationDuration}s`,
              animationDelay: `${sq.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              // Custom CSS animation defined in style tag below for the 'float' effect
            }}
          />
        ))}
      </ul>
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
            border-radius: 0;
          }
          100% {
            transform: translateY(-1000px) rotate(720deg);
            opacity: 0;
            border-radius: 50%;
          }
        }
        .animate-float {
          animation-name: float;
        }
      `}</style>
    </div>
  );
};

export default Background;