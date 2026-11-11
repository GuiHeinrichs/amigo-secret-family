import { expect, test } from "@playwright/test";
import { createGroup, newPhone, testEmail } from "./helpers";

test("menu lateral no celular: abre, navega, fecha e some em telas grandes", async ({ browser }) => {
  const email = testEmail("menu");
  const phone = await newPhone(browser, email);
  const slug = await createGroup(phone, { name: "Menu de Teste", organizer: "Zeca" });
  await phone.goto(`/g/${slug}`);

  const burger = phone.getByRole("button", { name: "Abrir menu" });
  const menu = phone.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeHidden();

  await burger.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Menu de Teste")).toBeVisible();
  await expect(menu.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
  for (const name of ["Minha lista", "Organizar", "Meus grupos", "Criar um grupo"]) {
    await expect(menu.getByRole("link", { name })).toBeVisible();
  }
  await expect(menu.getByText(email)).toBeVisible();
  // O foco entra no menu ao abrir.
  await expect(menu.getByRole("button", { name: "Fechar menu" })).toBeFocused();

  // Navegar por um item fecha o menu e leva à página.
  await menu.getByRole("link", { name: "Minha lista" }).click();
  await expect(phone.getByRole("heading", { name: "Lista de desejos" })).toBeVisible();
  await expect(menu).toBeHidden();

  // Esc fecha e devolve o foco ao botão.
  await burger.click();
  await expect(menu).toBeVisible();
  await phone.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(burger).toBeFocused();

  // Tocar fora também fecha.
  await burger.click();
  await expect(menu).toBeVisible();
  await phone.mouse.click(20, 400);
  await expect(menu).toBeHidden();

  // Em telas grandes não há hambúrguer; "Organizar" volta para o cabeçalho.
  await phone.setViewportSize({ width: 1280, height: 800 });
  await expect(burger).toBeHidden();
  await expect(phone.getByRole("link", { name: "Organizar" })).toBeVisible();
});
