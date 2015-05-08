# Piffle

Piffle är ett system för att övervaka rum och områden med hjälp av olika sensorer kopplade till ett arbiträrt antal Raspberry Pi-datorer.

En sensor (som kör `runsensor.py` i `sensornode`) lyssnar kontinuerligt efter en anslutning av en server (`nånting` i `servernode`), och börjar sedan skicka bilder och mätdata till servern. Detta presenteras sedan i en vacker och användarvänlig front-end.

# Servernod

erik please add informotion

# Sensornoder

För att köra en sensornod, se till att den har termometer och kamera (termometer kan utebliva). Kör sedan `python runsensor.py` (i `sensornode`), och så borde du vara igång. Skicka sedan ett config-kommando via server-sensor-TCP-interfacet med en giltig config inklusige unikt sensor-ID, och så borde bilder och mätdata genast börja pushas till rätt databas och hamna på rätt ställe på servern. Config för sensorer är fullkomligt hotswapbar - uppdatera bara genom TCP-interfacet.

För att lägga till nya sensorer med nya typer av mätdata, gör helt enkelt en subclass av `runsensor.Sensor` och skriv över `do`-metoden. Den kommer sedan att köras efter varje delay-intervall som är satt på sensorns ID i sensornodens config.

## planen.txt
---
Planen är i stort sett att strunta i det mesta Erik säger (tills han kommer, i alla fall) och se om vi kan göra något vettigt över huvud taget.

Tack, bra, okej, bra.

---

Detta var originalmanifestet som Piffle föddes av. Det har tjänat oss väl, och visat sig vara ett par grundprinciper som var värda att bygga ett så vackert projekt på.
