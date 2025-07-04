import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Box, 
  Sphere, 
  Plane, 
  Text,
  Environment,
  OrbitControls,
  Float,
  Stars,
  Sparkles,
  ContactShadows
} from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// 3D Event Card Component
export const EventCard3D = ({ event, position, onClick, isHovered, onHover }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      
      // Gentle rotation when hovered
      if (hovered || isHovered) {
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.scale.setScalar(1.05);
      } else {
        meshRef.current.rotation.y = 0;
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.2}
      floatIntensity={0.5}
    >
      <group
        ref={meshRef}
        position={position}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover && onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover && onHover(false);
        }}
      >
        {/* Main card body */}
        <Box args={[2.5, 3.5, 0.2]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color={hovered ? "#4a9eff" : "#ffffff"}
            roughness={0.1}
            metalness={0.1}
            transparent={true}
            opacity={0.9}
          />
        </Box>
        
        {/* Card header */}
        <Box args={[2.4, 1, 0.21]} position={[0, 1.2, 0.05]}>
          <meshStandardMaterial 
            color={hovered ? "#2563eb" : "#f8fafc"}
            roughness={0.2}
          />
        </Box>
        
        {/* Event title */}
        <Text
          position={[0, 1.2, 0.15]}
          fontSize={0.2}
          color={hovered ? "#ffffff" : "#1e293b"}
          anchorX="center"
          anchorY="middle"
          maxWidth={2.2}
          textAlign="center"
        >
          {event.title}
        </Text>
        
        {/* Event location */}
        <Text
          position={[0, 0.5, 0.15]}
          fontSize={0.15}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.2}
          textAlign="center"
        >
          📍 {event.location}
        </Text>
        
        {/* Event price */}
        <Text
          position={[0, -0.5, 0.15]}
          fontSize={0.18}
          color="#059669"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.2}
          textAlign="center"
        >
          ${event.price_regular}
        </Text>
        
        {/* IEEE pricing badge */}
        {event.price_ieee_member && (
          <group position={[0, -1.2, 0.15]}>
            <Box args={[1.5, 0.4, 0.05]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#10b981" />
            </Box>
            <Text
              position={[0, 0, 0.05]}
              fontSize={0.12}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              IEEE: ${event.price_ieee_member}
            </Text>
          </group>
        )}
        
        {/* Interactive glow effect */}
        {hovered && (
          <Sphere args={[2.8]} position={[0, 0, 0]}>
            <meshBasicMaterial 
              color="#4a9eff"
              transparent={true}
              opacity={0.1}
              side={THREE.BackSide}
            />
          </Sphere>
        )}
      </group>
    </Float>
  );
};

// 3D Scene Background
export const Scene3DBackground = ({ children }) => {
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: -1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4a9eff" />
        
        <Stars 
          radius={100} 
          depth={50} 
          count={1000} 
          factor={4} 
          saturation={0} 
          fade={true} 
          speed={0.5}
        />
        
        <Sparkles 
          count={50}
          scale={10}
          size={2}
          speed={0.4}
          opacity={0.6}
          color="#ffffff"
        />
        
        <Environment preset="city" />
      </Canvas>
      
      <div style={{ 
        position: 'relative', 
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        minHeight: '100vh'
      }}>
        {children}
      </div>
    </div>
  );
};

// 3D Events Grid
export const Events3DGrid = ({ events, onEventSelect }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const eventPositions = useMemo(() => {
    const positions = [];
    const cols = 3;
    const spacing = 3.5;
    
    events.forEach((_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = (col - (cols - 1) / 2) * spacing;
      const y = -row * 4;
      const z = 0;
      positions.push([x, y, z]);
    });
    
    return positions;
  }, [events]);

  return (
    <div style={{ height: '80vh', width: '100%' }}>
      <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#4a9eff" />
        
        <Stars radius={100} depth={50} count={500} factor={2} />
        
        <ContactShadows 
          position={[0, -2, 0]} 
          opacity={0.4} 
          scale={20} 
          blur={2} 
          far={4.5} 
        />
        
        {events.map((event, index) => (
          <EventCard3D
            key={event.id}
            event={event}
            position={eventPositions[index]}
            onClick={() => onEventSelect(event)}
            isHovered={hoveredIndex === index}
            onHover={(hovered) => setHoveredIndex(hovered ? index : null)}
          />
        ))}
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={15}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />
        
        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
};

// 3D Hero Section
export const Hero3D = () => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <div style={{ height: '60vh', width: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4a9eff" />
        
        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.8}>
          <group ref={meshRef}>
            {/* Main ticket symbol */}
            <Box args={[3, 4, 0.3]} position={[0, 0, 0]}>
              <meshStandardMaterial 
                color="#4a9eff"
                roughness={0.1}
                metalness={0.3}
              />
            </Box>
            
            {/* Ticket perforations */}
            {[-1.2, -0.6, 0, 0.6, 1.2].map((y, i) => (
              <Sphere key={i} args={[0.1]} position={[1.5, y, 0.2]}>
                <meshStandardMaterial color="#ffffff" />
              </Sphere>
            ))}
            
            {/* Trading chart symbol */}
            <Box args={[2, 2, 0.2]} position={[0, 0, 0.4]}>
              <meshStandardMaterial 
                color="#10b981"
                transparent={true}
                opacity={0.8}
              />
            </Box>
          </group>
        </Float>
        
        <Stars radius={100} depth={50} count={300} factor={3} />
        <Sparkles count={30} scale={8} size={1} speed={0.3} />
        
        <Environment preset="warehouse" />
      </Canvas>
      
      {/* Overlay content */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'white',
        zIndex: 2,
        pointerEvents: 'none'
      }}>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          TicketVerse & Trading 3D
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ 
            fontSize: '1.2rem',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          Experience the future of event ticketing and algorithmic trading
        </motion.p>
      </div>
    </div>
  );
};

// 3D Navigation Elements
export const Nav3DElements = () => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100vh', 
      pointerEvents: 'none',
      zIndex: -1
    }}>
      <Canvas>
        <ambientLight intensity={0.2} />
        
        {/* Floating geometric shapes */}
        <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.3}>
          <Box args={[0.5, 0.5, 0.5]} position={[-8, 4, -5]}>
            <meshStandardMaterial 
              color="#4a9eff" 
              transparent={true} 
              opacity={0.3}
            />
          </Box>
        </Float>
        
        <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.4}>
          <Sphere args={[0.3]} position={[8, -3, -3]}>
            <meshStandardMaterial 
              color="#10b981" 
              transparent={true} 
              opacity={0.4}
            />
          </Sphere>
        </Float>
        
        <Float speed={0.6} rotationIntensity={0.1} floatIntensity={0.2}>
          <Box args={[0.3, 1, 0.3]} position={[6, 2, -4]}>
            <meshStandardMaterial 
              color="#f59e0b" 
              transparent={true} 
              opacity={0.3}
            />
          </Box>
        </Float>
      </Canvas>
    </div>
  );
};