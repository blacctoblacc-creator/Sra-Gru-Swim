import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

const IMAGES = {
  logo: require("./assets/Mockups/blacc.png"),
  professor: require("./assets/Mockups/professor.png"),
  aluno: require("./assets/Mockups/aluno.png"),
  turmas: require("./assets/Mockups/turmas.png"),
  sessao: require("./assets/Mockups/sessao.png"),
  relatorios: require("./assets/Mockups/relatorios.png"),
  splash: require("./assets/Mockups/splash-icon.png"),
};

export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={IMAGES.logo} style={styles.logo} />

      <Text style={styles.title}>Sra Gru Swim</Text>

      <TouchableOpacity style={styles.button}>
        <Image source={IMAGES.professor} style={styles.icon} />
        <Text style={styles.buttonText}>Professor</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Image source={IMAGES.aluno} style={styles.icon} />
        <Text style={styles.buttonText}>Aluno</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Image source={IMAGES.turmas} style={styles.icon} />
        <Text style={styles.buttonText}>Turmas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Image source={IMAGES.sessao} style={styles.icon} />
        <Text style={styles.buttonText}>Sessão</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Image source={IMAGES.relatorios} style={styles.icon} />
        <Text style={styles.buttonText}>Relatórios</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E90FF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
    width: "90%",
  },
  icon: {
    width: 32,
    height: 32,
    marginRight: 15,
    resizeMode: "contain",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
});
