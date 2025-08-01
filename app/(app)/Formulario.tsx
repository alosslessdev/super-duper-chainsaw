import { useRouter, useFocusEffect } from 'expo-router'; 
import React, { useState, useCallback } from 'react'; 
import { Alert, BackHandler } from 'react-native'; 
import styled from 'styled-components/native'; 

const Formulario = () => { 
  const router = useRouter(); 

  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [telefono, setTelefono] = useState(''); 

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace('/login');
        return true; // Return true to prevent default back button behavior
      };

      // Add the event listener and get the subscription object
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // The cleanup function now uses the `remove()` method on the subscription object.
      return () => backHandler.remove();
    }, [router])
  );

  const handleRegister = async () => { 
    if (email.trim() === '' || password.trim() === '') { 
      Alert.alert('Error', 'Por favor completa todos los campos'); 
      return;
    } 

    setLoading(true); 

    try { 
      const response = await fetch('https://octopus-app-jjamd.ondigitalocean.app/usuarios', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
        }, 
        body: JSON.stringify({ 
          email: email, 
          password: password, 
        }), 
      }); 

      if (response.ok) { 
        Alert.alert('Registro Exitoso', 'Te has registrado correctamente', [ 
          { text: 'Aceptar', onPress: () => router.replace('/login') }, 
        ]); 
      } else { 
        const errorData = await response.json(); 
        Alert.alert( 
          'Error de Registro', 
          errorData.message || 'Ocurrió un error inesperado' 
        ); 
      } 
    } catch (error) { 
      console.error('Error durante el registro:', error); 
      Alert.alert( 
        'Error de Conexión', 
        'No se pudo conectar al servidor. Por favor, inténtalo de nuevo.' 
      ); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  return ( 
    <Container> 
      <Logo>Registro</Logo> 

      <Label>Correo Electrónico</Label> 
      <Input 
        placeholder="correo@ejemplo.com" 
        keyboardType="email-address" 
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false} 
      /> 

      <Label>Contraseña</Label> 
      <Input 
        placeholder="••••••••" 
        secureTextEntry
        value={password}
        onChangeText={setPassword} 
      /> 

      <Label>Número Telefónico</Label> 
      <Input 
        placeholder="60001234" 
        keyboardType="phone-pad" 
        value={telefono}
        onChangeText={setTelefono} 
      />
      
      <Button onPress={handleRegister} disabled={loading}> 
        <ButtonText>{loading ? 'Registrando...' : 'Registrarse'}</ButtonText> 
      </Button> 
    </Container> 
  ); 
}; 

export default Formulario; 

// Estilos
// ... (Your styled-components code remains the same)

// --- Estilos ---
// These are all styled components with their base components defined.

const Container = styled.View`
  flex: 1;
  padding: 20px;
  justify-content: center;
  background-color: #f0f0f0;
`;

const Logo = styled.Text`
  font-size: 32px;
  text-align: center;
  margin-bottom: 40px;
  font-weight: bold;
  color: #333;
`;

const Label = styled.Text`
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
`;

const Input = styled.TextInput`
  border-radius: 12px;
  padding: 15px 18px;
  margin-bottom: 20px;
  background-color: #fff;
  border-width: 1px;
  border-color: #ddd;
  font-size: 16px;
  color: #000000;
`;

const Button = styled.TouchableOpacity`
  padding: 18px;
  border-radius: 12px;
  align-items: center;
  margin-vertical: 10px;
  background-color: #0a84ff;
`;

const ButtonText = styled.Text`
  color: white;
  font-weight: bold;
  font-size: 18px;
`;
