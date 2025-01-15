class TrackAsset {
    static createSVG() {
        return `
            <svg width="100%" height="100%" class="track">
                <!-- Track background -->
                <rect x="0" y="0" width="100%" height="100%" 
                    fill="#000" />
                
                <!-- Racing lines -->
                <g class="racing-lines">
                    ${Array.from({length: 4}, (_, i) => `
                        <line class="race-line" 
                            x1="0" y1="${100 + (i * 80)}" 
                            x2="100%" y2="${100 + (i * 80)}"
                            stroke="#333"
                            stroke-width="2"
                            stroke-dasharray="10,10"
                        />
                    `).join('')}
                </g>
                
                <!-- Start line -->
                <line class="start-line"
                    x1="100" y1="50"
                    x2="100" y2="450"
                    stroke="#fff"
                    stroke-width="4"
                />
                
                <!-- Finish line -->
                <g class="finish-line" transform="translate(1800, 0)">
                    ${Array.from({length: 10}, (_, i) => `
                        <rect x="0" y="${i * 40}" 
                            width="20" height="20" 
                            fill="${i % 2 === 0 ? '#fff' : '#000'}"
                        />
                    `).join('')}
                </g>
            </svg>
        `;
    }
} 