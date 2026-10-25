import { Perfil } from "@/domain/classes/Perfil";
import { Persona } from "@/domain/classes/Persona";

export interface RequestBody {
    Persona: Persona
    Perfil: Perfil
}