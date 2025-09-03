import React from 'react';

/**
 * TerrainTextures component provides SVG pattern definitions
 * for enhanced terrain rendering with realistic textures
 */
const TerrainTextures: React.FC = () => {
  return (
    <defs>
      {/* Grassland Texture */}
      <pattern id="grassland" patternUnits="userSpaceOnUse" width="20" height="20">
        <rect width="20" height="20" fill="#90EE90" />
        <g stroke="#228B22" strokeWidth="0.5" opacity="0.4">
          <path d="M2,18 Q3,15 4,18 M6,16 Q7,13 8,16 M10,17 Q11,14 12,17" />
          <path d="M14,15 Q15,12 16,15 M18,17 Q19,14 20,17" />
          <path d="M1,10 Q2,7 3,10 M5,8 Q6,5 7,8 M9,9 Q10,6 11,9" />
          <path d="M13,7 Q14,4 15,7 M17,9 Q18,6 19,9" />
          <path d="M3,3 Q4,0 5,3 M7,1 Q8,-2 9,1 M11,2 Q12,-1 13,2" />
          <path d="M15,0 Q16,-3 17,0 M19,2 Q20,-1 21,2" />
        </g>
        <circle cx="4" cy="6" r="0.5" fill="#FFD700" opacity="0.6" />
        <circle cx="16" cy="14" r="0.5" fill="#FFD700" opacity="0.6" />
      </pattern>

      {/* Plains Texture */}
      <pattern id="plains" patternUnits="userSpaceOnUse" width="24" height="24">
        <rect width="24" height="24" fill="#F0E68C" />
        <g stroke="#DAA520" strokeWidth="0.3" opacity="0.5">
          <path d="M0,12 Q6,10 12,12 Q18,14 24,12" />
          <path d="M0,6 Q6,4 12,6 Q18,8 24,6" />
          <path d="M0,18 Q6,16 12,18 Q18,20 24,18" />
        </g>
        <g fill="#B8860B" opacity="0.3">
          <rect x="3" y="8" width="1" height="8" />
          <rect x="7" y="10" width="1" height="6" />
          <rect x="11" y="9" width="1" height="7" />
          <rect x="15" y="11" width="1" height="5" />
          <rect x="19" y="7" width="1" height="9" />
        </g>
      </pattern>

      {/* Hills Texture */}
      <pattern id="hills" patternUnits="userSpaceOnUse" width="30" height="20">
        <rect width="30" height="20" fill="#8B4513" />
        <path d="M0,20 Q7.5,5 15,20 Q22.5,5 30,20" fill="#A0522D" />
        <path d="M0,20 Q5,12 10,20 Q15,12 20,20 Q25,12 30,20" fill="#654321" opacity="0.6" />
        <g fill="#228B22" opacity="0.4">
          <circle cx="5" cy="15" r="1.5" />
          <circle cx="12" cy="13" r="1" />
          <circle cx="18" cy="16" r="1.2" />
          <circle cx="25" cy="14" r="0.8" />
        </g>
      </pattern>

      {/* Mountains Texture */}
      <pattern id="mountains" patternUnits="userSpaceOnUse" width="40" height="30">
        <rect width="40" height="30" fill="#A9A9A9" />
        <polygon points="0,30 8,10 16,30" fill="#696969" />
        <polygon points="12,30 20,5 28,30" fill="#778899" />
        <polygon points="24,30 32,8 40,30" fill="#696969" />
        <polygon points="8,10 12,2 16,10" fill="#DCDCDC" />
        <polygon points="20,5 24,0 28,5" fill="#F5F5F5" />
        <polygon points="32,8 36,3 40,8" fill="#DCDCDC" />
        <g fill="#FFFAFA" opacity="0.8">
          <polygon points="10,6 12,2 14,6" />
          <polygon points="22,3 24,0 26,3" />
          <polygon points="34,5 36,3 38,5" />
        </g>
      </pattern>

      {/* Desert Texture */}
      <pattern id="desert" patternUnits="userSpaceOnUse" width="25" height="25">
        <rect width="25" height="25" fill="#F4A460" />
        <g stroke="#D2691E" strokeWidth="0.5" fill="none" opacity="0.4">
          <path d="M0,5 Q6,7 12,5 Q18,3 25,5" />
          <path d="M0,12 Q6,14 12,12 Q18,10 25,12" />
          <path d="M0,19 Q6,21 12,19 Q18,17 25,19" />
        </g>
        <g fill="#CD853F" opacity="0.6">
          <circle cx="8" cy="8" r="0.8" />
          <circle cx="18" cy="15" r="1.2" />
          <circle cx="5" cy="20" r="0.5" />
          <circle cx="20" cy="6" r="0.7" />
        </g>
        <path d="M12,18 L14,16 L16,18 L14,20 Z" fill="#DEB887" opacity="0.5" />
      </pattern>

      {/* Ocean Texture */}
      <pattern id="ocean" patternUnits="userSpaceOnUse" width="30" height="20">
        <rect width="30" height="20" fill="#4682B4" />
        <g stroke="#1E90FF" strokeWidth="1" fill="none" opacity="0.6">
          <path d="M0,10 Q7.5,6 15,10 Q22.5,14 30,10" />
          <path d="M0,15 Q7.5,11 15,15 Q22.5,19 30,15" />
        </g>
        <g stroke="#87CEEB" strokeWidth="0.5" fill="none" opacity="0.4">
          <path d="M0,5 Q7.5,3 15,5 Q22.5,7 30,5" />
          <path d="M0,20 Q7.5,18 15,20 Q22.5,22 30,20" />
        </g>
        <g fill="#FFFFFF" opacity="0.2">
          <circle cx="5" cy="8" r="1" />
          <circle cx="20" cy="12" r="0.8" />
          <circle cx="12" cy="16" r="0.6" />
        </g>
      </pattern>

      {/* Coast Texture */}
      <pattern id="coast" patternUnits="userSpaceOnUse" width="25" height="25">
        <rect width="25" height="25" fill="#87CEEB" />
        <g stroke="#4682B4" strokeWidth="1" fill="none" opacity="0.5">
          <path d="M0,8 Q6,6 12,8 Q18,10 25,8" />
          <path d="M0,15 Q6,13 12,15 Q18,17 25,15" />
        </g>
        <g fill="#F4A460" opacity="0.7">
          <ellipse cx="3" cy="20" rx="2" ry="1" />
          <ellipse cx="8" cy="22" rx="1.5" ry="0.8" />
          <ellipse cx="15" cy="21" rx="2.5" ry="1.2" />
          <ellipse cx="22" cy="23" rx="1.8" ry="0.9" />
        </g>
      </pattern>

      {/* Tundra Texture */}
      <pattern id="tundra" patternUnits="userSpaceOnUse" width="20" height="20">
        <rect width="20" height="20" fill="#D3D3D3" />
        <g stroke="#A9A9A9" strokeWidth="0.3" opacity="0.5">
          <path d="M2,2 L4,4 M6,1 L8,3 M10,0 L12,2 M14,3 L16,5 M18,1 L20,3" />
          <path d="M1,8 L3,10 M5,7 L7,9 M9,6 L11,8 M13,9 L15,11 M17,7 L19,9" />
          <path d="M0,14 L2,16 M4,13 L6,15 M8,12 L10,14 M12,15 L14,17 M16,13 L18,15" />
        </g>
        <g fill="#2F4F4F" opacity="0.3">
          <rect x="5" y="5" width="2" height="3" />
          <rect x="12" y="8" width="1.5" height="2.5" />
          <rect x="8" y="15" width="1.8" height="2" />
          <rect x="15" y="3" width="1.2" height="2.8" />
        </g>
      </pattern>

      {/* Snow Texture */}
      <pattern id="snow" patternUnits="userSpaceOnUse" width="15" height="15">
        <rect width="15" height="15" fill="#FFFAFA" />
        <g fill="#E6E6FA" opacity="0.8">
          <circle cx="3" cy="3" r="0.5" />
          <circle cx="8" cy="6" r="0.7" />
          <circle cx="12" cy="2" r="0.4" />
          <circle cx="5" cy="10" r="0.6" />
          <circle cx="11" cy="12" r="0.5" />
          <circle cx="2" cy="8" r="0.3" />
          <circle cx="13" cy="9" r="0.8" />
        </g>
        <g stroke="#B0C4DE" strokeWidth="0.2" opacity="0.4">
          <path d="M3,3 L3.5,2.5 M3,3 L2.5,2.5 M3,3 L3.5,3.5 M3,3 L2.5,3.5" />
          <path d="M8,6 L8.5,5.5 M8,6 L7.5,5.5 M8,6 L8.5,6.5 M8,6 L7.5,6.5" />
          <path d="M11,12 L11.5,11.5 M11,12 L10.5,11.5 M11,12 L11.5,12.5 M11,12 L10.5,12.5" />
        </g>
      </pattern>

      {/* Forest Texture */}
      <pattern id="forest" patternUnits="userSpaceOnUse" width="25" height="25">
        <rect width="25" height="25" fill="#228B22" />
        <g fill="#006400" opacity="0.8">
          <polygon points="5,20 7,15 9,20" />
          <polygon points="3,18 5,12 7,18" />
          <polygon points="12,22 15,16 18,22" />
          <polygon points="10,19 12,13 14,19" />
          <polygon points="19,21 21,15 23,21" />
          <polygon points="17,18 19,12 21,18" />
        </g>
        <g fill="#32CD32" opacity="0.6">
          <circle cx="6" cy="15" r="2" />
          <circle cx="15" cy="16" r="2.5" />
          <circle cx="20" cy="15" r="2" />
        </g>
        <g fill="#654321" opacity="0.9">
          <rect x="5.5" y="18" width="1" height="2" />
          <rect x="14.5" y="19" width="1" height="3" />
          <rect x="19.5" y="18" width="1" height="3" />
        </g>
      </pattern>

      {/* Jungle Texture */}
      <pattern id="jungle" patternUnits="userSpaceOnUse" width="30" height="30">
        <rect width="30" height="30" fill="#006400" />
        <g fill="#228B22" opacity="0.9">
          <circle cx="5" cy="20" r="3" />
          <circle cx="15" cy="18" r="4" />
          <circle cx="25" cy="22" r="3.5" />
          <circle cx="8" cy="10" r="2.5" />
          <circle cx="20" cy="8" r="3" />
          <circle cx="3" cy="5" r="2" />
          <circle cx="27" cy="7" r="2.8" />
        </g>
        <g fill="#32CD32" opacity="0.7">
          <ellipse cx="5" cy="15" rx="2" ry="4" />
          <ellipse cx="12" cy="12" rx="1.5" ry="3" />
          <ellipse cx="22" cy="14" rx="2.5" ry="5" />
          <ellipse cx="8" cy="25" rx="1.8" ry="3.5" />
          <ellipse cx="18" cy="28" rx="2" ry="4" />
        </g>
        <g stroke="#9ACD32" strokeWidth="0.5" fill="none" opacity="0.5">
          <path d="M0,0 Q10,5 20,0 Q25,10 30,5" />
          <path d="M0,15 Q8,20 16,15 Q24,10 30,15" />
          <path d="M0,25 Q12,30 24,25 Q27,20 30,25" />
        </g>
      </pattern>

      {/* Resource Overlays */}
      <pattern id="gold" patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="none" />
        <circle cx="5" cy="5" r="2" fill="#FFD700" opacity="0.8" />
        <circle cx="5" cy="5" r="1" fill="#FFF" opacity="0.6" />
      </pattern>

      <pattern id="iron" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="none" />
        <rect x="2" y="2" width="4" height="4" fill="#708090" opacity="0.8" />
        <rect x="3" y="3" width="2" height="2" fill="#C0C0C0" opacity="0.7" />
      </pattern>

      <pattern id="oil" patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill="none" />
        <circle cx="6" cy="6" r="3" fill="#000" opacity="0.7" />
        <circle cx="6" cy="6" r="1.5" fill="#333" opacity="0.9" />
      </pattern>
    </defs>
  );
};

export default TerrainTextures;