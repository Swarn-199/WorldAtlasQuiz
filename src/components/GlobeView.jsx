import {useNavigate} from 'react-router-dom';
import React, {useEffect, useRef, useState} from 'react';
import Globe from 'react-globe.gl';
const CUSTOM_FLAGS = {
  "Afghanistan": "https://flagpedia.net/data/flags/w1600/af.png",
  "Northern Cyprus": "https://img.freepik.com/premium-vector/northern-cyprus-flag-vector_671352-142.jpg"
};

const GlobeView = () => {
    const navigate = useNavigate();
    const [isAutoRotate, setIsAutoRotate] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [hoveredPolygon, setHoveredPolygon] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for signup
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || null);

    const globeEl = useRef();
    const [countries, setCountries] = useState({ features: []});

    //For fetching the country borders data
    useEffect(() => {
        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => setCountries(data))
    }, []);

    //For auto rotation of the globe
    useEffect(() => {
        setTimeout(() => {
            const controls = globeEl.current.controls();
            if(controls){
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.5;
            }
        },100);
    }, []);

    useEffect(() => {
        if (globeEl.current) {
            const controls = globeEl.current.controls();
            controls.autoRotate = isAutoRotate && (hoveredPolygon === null); // Stop rotation when hovering a country
            controls.autoRotateSpeed = 0.5;
        }
    },[isAutoRotate, hoveredPolygon]);

    const handleCountrySelect = (properties) => {
        try {
        const countryCode = properties.ISO_A3;
        const countryName = properties.ADMIN; 

        if (countryName === 'Northern Cyprus'){
            countryCode = 'CYP';
            countryName = 'Cyprus';
        }

        // Close the search dropdown and clear the text when a country is picked
        setIsDropdownOpen(false);
        setSearchQuery('');
        
        setSelectedCountry(properties);

        let fetchUrl = countryCode !== '-99' 
            ? `https://restcountries.com/v3.1/alpha/${countryCode}` 
            : `https://restcountries.com/v3.1/name/${countryName}`;

        fetch(fetchUrl)
            .then(res => {
            if (!res.ok) throw new Error("Country not found in API");
            return res.json();
            })
            .then(data => {
            const fullData = data[0];

            if (globeEl.current && fullData.latlng) {
                const [lat, lng] = fullData.latlng;
                globeEl.current.pointOfView({ lat, lng, altitude: 1.9 }, 1000);
            }
            setSelectedCountry(prev => ({
                ...prev,
                flag: CUSTOM_FLAGS[properties.ADMIN] || fullData.flags.png,
                population: fullData.population.toLocaleString(),
                capital: fullData.capital ? fullData.capital[0] : 'N/A',
                region: fullData.region,
                subregion: fullData.subregion,
                currencies: fullData.currencies ? Object.values(fullData.currencies)[0].name : 'N/A'
            }));
            })
            .catch(err => console.error('Error fetching country details:', err));
            
        } catch (error) {
        console.error('Error processing country data:', error);
        }
    };

    const filteredCountries = countries.features
        ? countries.features
        .filter(polygon => polygon.properties.ADMIN !== 'Northern Cyprus')
        .filter(polygon => polygon.properties.ADMIN.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.properties.ADMIN.localeCompare(b.properties.ADMIN)) // Sort A-Z
    : [];

    const handleAuthSubmit = async(e) => {
        e.preventDefault();
        const endpoint = isLoginMode ? '/login' : '/register'
        
        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: authUsername, password: authPassword })
            });
        const data = await res.json();

            if(res.ok){
                setCurrentUser(data.username);
                localStorage.setItem('username', data.username);
                localStorage.setItem('highsScore', data.highscore || 0);

                setShowAuthModal(false);
                setAuthUsername('');
                setAuthPassword('');
                alert(`Welcome, ${data.username}!`);
            }
            else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            alert('Could not connect to the server. Is Node running?');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('username');
        localStorage.removeItem('highscore');
    };
    

    return (
        <div style = {{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative'}}>

            <div style = {{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 1000,
                display: 'flex',
                gap: '15px',
                alignItems: 'center'
            }}>
                {currentUser ? (
                    <>
                        <span style = {{
                            color: '#4ade80',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            textShadow: '0 0 5px rgba(74, 222, 128, 0.7)'
                        }}>
                            {currentUser}
                        </span>
                        <button 
                            onClick={handleLogout}
                            style = {{
                                padding: '8px 16px',
                                backgroundColor: '#e63946',
                                color: 'white',
                                borderRadius: '5px',
                                cursonr: 'pointer',
                                fontWeight: 'bold',
                            }}
                        >Logout</button>
                    </>
                ) : (
                    <button 
                        onClick={() => setShowAuthModal(true)}
                        style = {{
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
                        }}
                    >Login / Sign Up</button>
                )}
            </div>

            {/* --- NEW: THE AUTHENTICATION MODAL --- */}
            {showAuthModal && (
                <div style={{
                position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(10, 25, 47, 0.8)', // Dark overlay
                backdropFilter: 'blur(5px)', // Premium glass effect
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 2000 
                }}>
                <div style={{
                    backgroundColor: '#112240', padding: '40px', borderRadius: '15px', width: '350px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#4ade80' }}>{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
                    <button onClick={() => setShowAuthModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                    </div>

                    <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input 
                        type="text" placeholder="Username" required
                        value={authUsername} onChange={(e) => setAuthUsername(e.target.value)}
                        style={{ padding: '12px', borderRadius: '5px', border: 'none', outline: 'none', fontSize: '16px' }}
                    />
                    <input 
                        type="password" placeholder="Password" required
                        value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                        style={{ padding: '12px', borderRadius: '5px', border: 'none', outline: 'none', fontSize: '16px' }}
                    />
                    <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>
                        {isLoginMode ? 'Login' : 'Sign Up'}
                    </button>
                    </form>

                    <p style={{ textAlign: 'center', margin: 0, fontSize: '14px', color: '#8892b0' }}>
                    {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                    <span 
                        onClick={() => setIsLoginMode(!isLoginMode)}
                        style={{ color: '#4ade80', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isLoginMode ? 'Sign up here' : 'Login here'}
                    </span>
                    </p>
                </div>
                </div>
            )}
            
            <button onClick={() => navigate('/game')}
            style = {{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: 'rgba(137, 196, 255, 0.48)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            }}
        >
                Play Atlas Quiz
            </button>

            {/* --- NEW: AUTO-ROTATE TOGGLE BUTTON --- */}
            <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            style={{
                position: 'absolute',
                bottom: '30px',
                left: '30px',
                zIndex: 1000,
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: isAutoRotate ? '#0c62b369' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                transition: 'background-color 0.3s ease'
            }}
            >
      {isAutoRotate ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF'}
    </button>

            {/* --- NEW: THE SEARCH BAR --- */}
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            zIndex: 1000,
            width: '250px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <input 
            position="absolute"
            type="text" 
            placeholder="🔍 Search for a country..." 
            background-color = "rgba(235, 235, 235, 0.8)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '16px',
                borderRadius: isDropdownOpen ? '8px 8px 0 0' : '8px',
                border: 'none',
                outline: 'none',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                boxSizing: 'border-box'
            }}
            />
        
        {/* The Dropdown List */}
        {isDropdownOpen && (
            <ul style={{
            listStyleType: 'none',
            margin: 0,
            padding: 0,
            backgroundColor: 'white',
            maxHeight: '300px',
            overflowY: 'auto',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            width: '100%'
            }}>
            {filteredCountries.length > 0 ? (
                filteredCountries.map((country, index) => (
                <li 
                    key={index}
                    onClick={() => handleCountrySelect(country.properties)}
                    style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    color: '#333',
                    transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                    {country.properties.ADMIN}
                </li>
                ))
            ) : (
                <li style={{ padding: '12px 20px', color: '#999' }}>No countries found</li>
            )}
            </ul>
        )}
        </div>

        <div style = {{flex: selectedCountry ? 2 : 1, transition: 'all 0.5s ease', overflow: 'hidden'}}>
            <Globe
                //For creating the globe with the textures and the country borders
                ref={globeEl}
                backgroundImageUrl="/night-sky.png"
                globeImageUrl="/water.png"
                bumpImageUrl="/earth-topology.png"
                atmosphereColor="#1e90ff"
                atmosphereAltitude={0.15}

                //Country borders
                polygonsData={countries.features}
                polygonAltitude={0.01}
                polygonCapColor={(polygon) => {
                    if (polygon === hoveredPolygon) {
                        return 'rgb(219, 255, 204)'; // Highlight color
                    }
                    if (polygon.properties.ADMIN === 'Antarctica') {
                        return 'rgb(255, 255, 255)';
                    }
                    if (polygon.properties.ADMIN === selectedCountry?.ADMIN) {
                        return 'rgb(250, 100, 180)'; // Selected country color
                    }
                    return 'rgb(188, 231, 151)';
                }}
                polygonStrokeColor={(polygon) => {
                    if (polygon.properties.ADMIN === 'Antarctica') {
                        return 'rgb(138, 138, 138)';
                    }
                    return '#39c052';
                }}
                polygonSideColor={() => 'rgba(0, 10, 124, 0.91)'}

                onPolygonClick={(polygon) => handleCountrySelect(polygon.properties)}
                onGlobeClick={() => setIsDropdownOpen(false)}

                onPolygonHover={setHoveredPolygon}
            />
        </div>
            
            {selectedCountry && (
            <div style={{
                position: 'absolute',
                top: '70px',
                right: '40px',
                minWidth: '250px',
                maxWidth: '250px',
                padding: '30px',
                color:"rgb(255, 255, 255)",
                fontFamily: 'Arial, sans-serif',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.27)',
                zIndex: 100,
                overflowY: 'auto',
                background: 'none',
                backgroundColor: 'rgba(131, 131, 131, 0.18)',
                borderRadius: '32px',
                pointerEvents: 'auto',
            }}>
                <button onClick={() => setSelectedCountry(null)} style={{
                    float: 'right', backgroundColor: 'rgba(108, 108, 108, 0.22)', 
                    border: 'none', color: 'white', 
                    fontSize: '20px', cursor: 'pointer',
                    marginBottom: '20px', borderRadius: '50%'}}>×</button>
                {selectedCountry.flag && (
                    <img src={selectedCountry.flag} alt="flag" style={{
                        width: '80%',
                        borderRadius: '20px',
                        marginBottom: '20px',
                    }}/>
                )}
                <h1 style={{margin: '0 0 10px 0'}}> {selectedCountry.ADMIN} </h1>
                <hr/>
                <div>
                    <p><strong>Capital:</strong> {selectedCountry.capital || "Loading..."}</p>
                    <p><strong>Population:</strong> {selectedCountry.population || "Loading..."}</p>
                    <p><strong>Region:</strong> {selectedCountry.region || "Loading..."}</p>
                    <p><strong>Subregion:</strong> {selectedCountry.subregion || "Loading..."}</p>
                    <p><strong>Currencies:</strong> {selectedCountry.currencies || "Loading..."}</p>
                </div>
            </div>
            )}

        </div>    
    );
};

export default GlobeView;