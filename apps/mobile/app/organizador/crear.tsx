import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import "../../src/utils/calendarLocale";
import * as ImagePicker from "expo-image-picker";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { formatShortDate } from "../../src/utils/format";
import { fromCalendarDateString, toCalendarDateString } from "../../src/utils/eventFilters";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";


const TIME_SLOTS = [
  { label: "10:00 a.m.", hour: 10, minute: 0 },
  { label: "3:00 p.m.", hour: 15, minute: 0 },
  { label: "8:00 p.m.", hour: 20, minute: 0 },
  { label: "10:00 p.m.", hour: 22, minute: 0 },
];

export default function CrearEventoScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createEvent, categories, cities } = useAppStore();
  const eventCategories = categories.filter((c) => c !== "Todos");

  const [title, setTitle] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [city, setCity] = useState("Barquisimeto");
  const [venueName, setVenueName] = useState("");
  const [description, setDescription] = useState("");
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [slotIndex, setSlotIndex] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!allowed) return null;

  const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);
  const quantityNum = parseInt(quantity, 10);

  const canSubmit =
    title.trim().length > 2 &&
    !!category &&
    venueName.trim().length > 1 &&
    !!customDate &&
    slotIndex !== null &&
    Number.isInteger(quantityNum) &&
    quantityNum > 0 &&
    (isFree || (Number.isFinite(priceCents) && priceCents > 0));

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Necesitamos acceso a tus fotos", "Actívalo desde Ajustes para poder elegir una imagen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !category || !customDate || slotIndex === null) return;
    const slot = TIME_SLOTS[slotIndex];
    const date = fromCalendarDateString(customDate);
    date.setHours(slot.hour, slot.minute, 0, 0);

    setSubmitted(true);
    const ok = await createEvent({
      title: title.trim(),
      category,
      city,
      venueName: venueName.trim(),
      description: description.trim() || "Sin descripción por ahora.",
      startsAt: date.toISOString(),
      durationMinutes: 180,
      isFree,
      priceCents: isFree ? 0 : priceCents,
      quantity: quantityNum,
      imageUri: imageUri ?? undefined,
    });
    if (!ok) {
      setSubmitted(false);
      return;
    }
    router.replace("/organizador");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Publicar evento</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Nombre del evento</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Noche de trivia en el centro"
          placeholderTextColor={color.text4}
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Foto del evento</Text>
        <Pressable style={styles.photoBox} onPress={handlePickImage}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.photoBadge}>
                <Text style={styles.photoBadgeText}>Así se ve en la app</Text>
              </View>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderTitle}>Toca para elegir una foto</Text>
              <Text style={styles.photoPlaceholderHint}>Horizontal, 1600 × 900 px (16:9)</Text>
            </View>
          )}
        </Pressable>
        {imageUri && (
          <Pressable onPress={handlePickImage} style={{ marginTop: 10 }}>
            <Text style={styles.changePhotoLink}>Cambiar foto</Text>
          </Pressable>
        )}
        <Text style={styles.hint}>
          Recomendado: 1600 × 900 px o más, horizontal (relación 16:9). Es exactamente el recorte que usan la
          portada del evento y las tarjetas en Buscar, así que lo que ves arriba es lo que va a ver la gente.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.chipsWrap}>
          {eventCategories.map((cat) => (
            <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(cat)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Ciudad</Text>
        <View style={styles.chipsWrap}>
          {cities.map((c) => (
            <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Lugar</Text>
        <TextInput
          value={venueName}
          onChangeText={setVenueName}
          placeholder="Ej. Complejo Ferial Bararida"
          placeholderTextColor={color.text4}
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Fecha</Text>
        <View style={styles.calendarCard}>
          <Calendar
            current={customDate ?? toCalendarDateString(new Date())}
            minDate={toCalendarDateString(new Date())}
            onDayPress={(day: { dateString: string }) => setCustomDate(day.dateString)}
            markedDates={customDate ? { [customDate]: { selected: true, selectedColor: color.pink } } : {}}
            firstDay={1}
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              textSectionTitleColor: color.text3,
              dayTextColor: color.text,
              todayTextColor: color.pink,
              monthTextColor: color.text,
              textDisabledColor: color.text4,
              arrowColor: color.pink,
              selectedDayBackgroundColor: color.pink,
              selectedDayTextColor: color.white,
              textDayFontFamily: fontFamily.semiBold,
              textMonthFontFamily: fontFamily.extraBold,
              textDayHeaderFontFamily: fontFamily.bold,
            }}
            style={styles.calendar}
          />
        </View>
        {customDate && <Text style={styles.hint}>{formatShortDate(fromCalendarDateString(customDate).toISOString())}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Hora</Text>
        <View style={styles.chipsWrap}>
          {TIME_SLOTS.map((slot, idx) => (
            <Chip key={slot.label} label={slot.label} selected={slotIndex === idx} onPress={() => setSlotIndex(idx)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Precio</Text>
        <View style={styles.chipsWrap}>
          <Chip label="Gratis" selected={isFree} onPress={() => setIsFree(true)} />
          <Chip label="De pago" selected={!isFree} onPress={() => setIsFree(false)} />
        </View>
        {!isFree && (
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Precio por entrada en USD, ej. 10"
            placeholderTextColor={color.text4}
            keyboardType="decimal-pad"
            style={[styles.input, { marginTop: 10 }]}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Cantidad de entradas</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Ej. 100"
          placeholderTextColor={color.text4}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Cuéntale a la gente qué va a encontrar en tu evento"
          placeholderTextColor={color.text4}
          multiline
          style={[styles.input, styles.textArea]}
        />
      </View>

      <View style={styles.section}>
        <PrimaryButton label="Publicar evento" disabled={!canSubmit || submitted} onPress={handleSubmit} />
        <Text style={styles.hint}>
          Este prototipo no pide pagos: tu evento aparecerá de inmediato en Buscar y en el mapa.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: color.text,
  },
  section: {
    paddingHorizontal: spacing.screenX,
    marginBottom: 20,
  },
  label: {
    fontFamily: fontFamily.extraBold,
    fontSize: 13,
    color: color.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  textArea: {
    height: 90,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoBox: {
    aspectRatio: 16 / 9,
    borderRadius: radius.cardLarge,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoPlaceholderTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text2,
  },
  photoPlaceholderHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: color.text4,
  },
  photoBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(11,11,10,0.65)",
  },
  photoBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: color.cream,
  },
  changePhotoLink: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: color.pink,
    textAlign: "center",
  },
  calendarCard: {
    borderRadius: radius.card,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    paddingBottom: 6,
  },
  calendar: {
    borderRadius: radius.card,
  },
  hint: {
    marginTop: 10,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: color.text4,
    lineHeight: 17,
  },
});
