# Участие в разработке и DCO

Патчи принимаются в этом репозитории.

Проект распространяется под **[Apache License 2.0](./LICENSE)** (см. также [NOTICE](./NOTICE)).
Вклады принимаются на тех же условиях (inbound = outbound), без отдельного CLA.

Для merge request действует **Developer Certificate of Origin (DCO) 1.1**: в каждом коммите (кроме merge-коммитов) в сообщении должна быть строка **Signed-off-by** с тем же email, что у автора коммита (`git` `config user.email`).

## Как подписать коммиты

- Новый коммит с подписью автоматически:

  ```bash
  git commit -s -m "Краткое описание изменения"
  ```

- Если подпись нужно добавить к последнему коммиту:

  ```bash
  git commit -s --amend --no-edit
  ```

- Несколько коммитов без подписи — переписать историю (осторожно, при уже запушенной ветке может понадобиться force push):

  ```bash
  git rebase main -x "git commit -s --amend --no-edit --no-verify"
  ```

  (подставьте целевую ветку вместо `main`, если у вас она называется иначе, например `master`.)

В каждом коммите (кроме merge-коммитов) нужна строка **Signed-off-by** с тем же email, что у автора коммита.

## Текст сертификата (DCO 1.1)

Подписывая коммит строкой `Signed-off-by`, вы подтверждаете следующее (оригинальный текст):

> Developer Certificate of Origin  
> Version 1.1
>
> Copyright (C) 2004, 2006 The Linux Foundation and its contributors.  
> 660 York Street, Suite 102,  
> San Francisco, CA 94111 USA
>
> Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.
>
> **Developer's Certificate of Origin 1.1**
>
> By making a contribution to this project, I certify that:
>
> (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
>
> (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
>
> (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.

Полный текст и комментарии: [developercertificate.org](https://developercertificate.org/).

## Безопасность

Сообщения об уязвимостях — по [SECURITY.md](./SECURITY.md), не через публичные issues.
