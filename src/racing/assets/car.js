// Base car SVG template
class CarAsset {
    static createSVG(color = '#ff0066', glowColor = 'rgba(255, 0, 102, 0.5)') {
        return `
            <svg width="120" height="40" viewBox="0 0 120 40" class="car">
                <!-- Car body -->
                <path class="car-body" d="
                    M 10,25
                    L 20,15
                    L 40,15
                    L 45,5
                    L 85,5
                    L 95,15
                    L 110,15
                    L 115,25
                    Z"
                    fill="${color}"
                    stroke="${color}"
                    stroke-width="2"
                    filter="url(#neon-glow)"
                />
                
                <!-- Windows -->
                <path class="windows" d="
                    M 45,15
                    L 50,8
                    L 80,8
                    L 85,15
                    Z"
                    fill="#111"
                    stroke="${color}"
                    stroke-width="1"
                />
                
                <!-- Wheels -->
                <circle class="wheel" cx="30" cy="25" r="8" 
                    fill="#111" stroke="${color}" stroke-width="2"/>
                <circle class="wheel" cx="90" cy="25" r="8" 
                    fill="#111" stroke="${color}" stroke-width="2"/>

                <!-- Neon underglow effect -->
                <rect class="underglow" 
                    x="20" y="33" width="80" height="4" 
                    fill="none" stroke="${color}" 
                    stroke-width="2" opacity="0.5"
                    filter="url(#neon-underglow)"
                />

                <!-- Filters for glow effects -->
                <defs>
                    <filter id="neon-glow">
                        <feGaussianBlur stdDeviation="2" result="blur"/>
                        <feFlood flood-color="${glowColor}" result="color"/>
                        <feComposite in="color" in2="blur" operator="in"/>
                        <feComposite in="SourceGraphic"/>
                    </filter>
                    <filter id="neon-underglow">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feFlood flood-color="${glowColor}" result="color"/>
                        <feComposite in="color" in2="blur" operator="in"/>
                        <feComposite in="SourceGraphic"/>
                    </filter>
                </defs>
            </svg>
        `;
    }
} 