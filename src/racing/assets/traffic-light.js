class TrafficLightAsset {
    static createSVG() {
        return `
            <svg width="40" height="120" viewBox="0 0 40 120" class="traffic-light">
                <!-- Housing -->
                <rect x="5" y="5" width="30" height="110" 
                    rx="5" ry="5" 
                    fill="#111" 
                    stroke="#333" 
                    stroke-width="2"/>
                
                <!-- Lights -->
                <circle class="light red" cx="20" cy="25" r="10" 
                    fill="#300" stroke="#600" stroke-width="2"/>
                <circle class="light yellow" cx="20" cy="60" r="10" 
                    fill="#330" stroke="#660" stroke-width="2"/>
                <circle class="light green" cx="20" cy="95" r="10" 
                    fill="#030" stroke="#060" stroke-width="2"/>
                
                <!-- Glow filters -->
                <defs>
                    <filter id="red-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feFlood flood-color="red" result="color"/>
                        <feComposite in="color" in2="blur" operator="in"/>
                        <feComposite in="SourceGraphic"/>
                    </filter>
                    <filter id="yellow-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feFlood flood-color="yellow" result="color"/>
                        <feComposite in="color" in2="blur" operator="in"/>
                        <feComposite in="SourceGraphic"/>
                    </filter>
                    <filter id="green-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feFlood flood-color="#00ff00" result="color"/>
                        <feComposite in="color" in2="blur" operator="in"/>
                        <feComposite in="SourceGraphic"/>
                    </filter>
                </defs>
            </svg>
        `;
    }

    static activateLight(element, color) {
        const light = element.querySelector(`.light.${color}`);
        light.style.fill = color;
        light.style.filter = `url(#${color}-glow)`;
    }
} 